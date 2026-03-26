import gifshot from "gifshot";
import html2canvas from "html2canvas";

const downloadBlob = (blob, filename) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportSnapshot = async (targetElement, filename = "algoviz-snapshot.png") => {
  const canvas = await html2canvas(targetElement, { backgroundColor: null });
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, "image/png");
};

export const exportGif = async (frames, filename = "algoviz-run.gif") =>
  new Promise((resolve, reject) => {
    gifshot.createGIF(
      {
        images: frames,
        gifWidth: 900,
        gifHeight: 420,
        interval: 0.15,
      },
      (result) => {
        if (!result.error) {
          const binary = atob(result.image.split(",")[1]);
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: "image/gif" });
          downloadBlob(blob, filename);
          resolve();
        } else {
          reject(new Error("GIF generation failed"));
        }
      },
    );
  });

export const exportVideo = async (frames, filename = "algoviz-run.mp4") => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 420;
  const context = canvas.getContext("2d");
  const stream = canvas.captureStream(20);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.start();
  for (const frame of frames) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setTimeout(resolve, 50);
      };
      image.src = frame;
    });
  }
  recorder.stop();

  await new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadBlob(blob, filename.replace(".mp4", ".webm"));
      resolve();
    };
  });
};
