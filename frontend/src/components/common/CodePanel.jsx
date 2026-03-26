import Prism from "prismjs";
import "prismjs/components/prism-python";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const CodePanel = ({ title, code }) => {
  const highlighted = Prism.highlight(code || "", Prism.languages.python, "python");

  return (
    <Card className="h-full border-border/70 bg-card/70" data-testid="code-panel-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base" data-testid="code-panel-title">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre
          className="max-h-[360px] overflow-auto rounded-xl border border-border/60 bg-background/80 p-4 font-code text-xs leading-relaxed"
          data-testid="code-panel-content"
        >
          {/* eslint-disable-next-line react/no-danger */}
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </CardContent>
    </Card>
  );
};
