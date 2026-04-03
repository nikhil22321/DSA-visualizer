import asyncio

import server


class StubTutorProvider:
    async def explain(self, payload, history):
        return server.TutorGeneration(
            text=f"AI tutor: step {payload.current_step} for {payload.algorithm}",
            provider="stub",
            model="stub-model",
            suggested_questions=["What happens next?"],
        )


def test_step_guide_uses_configured_provider(monkeypatch):
    monkeypatch.setattr(server, "storage", server.InMemoryStorage())
    tutor_service = server.TutorService()
    tutor_service.provider = StubTutorProvider()
    monkeypatch.setattr(server, "tutor_service", tutor_service)

    response = asyncio.run(
        server.explain_step(
            server.StepGuideRequest(
                algorithm="Merge Sort",
                current_step=3,
                explanation_context="Split the array into two halves",
                complexity="O(n log n)",
                internal_state={"left": [8, 3], "right": [7, 1]},
                mode="learning",
            )
        )
    )

    assert response.explanation == "AI tutor: step 3 for Merge Sort"
    assert len(response.suggested_questions) > 0


def test_step_guide_falls_back_when_provider_errors(monkeypatch):
    monkeypatch.setattr(server, "storage", server.InMemoryStorage())
    tutor_service = server.TutorService()

    async def raising_provider(payload, history):
        raise server.TutorProviderError("boom")

    class BrokenProvider:
        async def explain(self, payload, history):
            return await raising_provider(payload, history)

    tutor_service.provider = BrokenProvider()
    monkeypatch.setattr(server, "tutor_service", tutor_service)

    response = asyncio.run(
        server.explain_step(
            server.StepGuideRequest(
                algorithm="Quick Sort",
                current_step=4,
                explanation_context="Partition elements around the pivot",
                complexity="O(n log n)",
                internal_state={"pivot": 32, "left": 0, "right": 9},
                mode="expert",
            )
        )
    )

    assert "Quick Sort" in response.explanation
    assert "Partition elements around the pivot" in response.explanation
    assert len(response.suggested_questions) > 0
