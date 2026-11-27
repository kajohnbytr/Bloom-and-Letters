import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

export function Keepsake() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const [active, setActive] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [photo, setPhoto] = useState("");
  const [message, setMessage] = useState("");

  function stop() {
    request.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => () => stop(), []);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );

  async function start() {
    stop();
    const attempt = request.current;
    setPhoto("");
    setMessage("");
    setWaiting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera unavailable");
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (request.current !== attempt || !video.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      video.current.srcObject = next;
      await video.current.play();
      if (request.current !== attempt) return;
      setActive(true);
      setWaiting(false);
    } catch {
      if (request.current !== attempt) return;
      stop();
      setWaiting(false);
      setMessage(
        "The camera could not open. You can use the photo picker below.",
      );
    }
  }

  function capture() {
    const frame = video.current;
    if (!frame?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(frame, 0, 0);
    const attempt = request.current;
    canvas.toBlob(
      (blob) => {
        if (request.current !== attempt) return;
        if (!blob) {
          setMessage("The photo could not be saved. Try again.");
          return;
        }
        setPhoto(URL.createObjectURL(blob));
        stop();
        setActive(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <section className="keepsake">
      <h2>Take a keepsake photo</h2>
      <p>
        Optional. Your photo stays on this device and is never sent to the
        sender.
      </p>
      <video
        ref={video}
        muted
        playsInline
        hidden={!active}
        aria-label="Selfie preview"
      />
      {photo && <img src={photo} alt="Your keepsake photo" />}
      <div className="actions">
        {active ? (
          <button className="button" onClick={capture}>
            <Camera size={18} /> Take Photo
          </button>
        ) : (
          <button disabled={waiting} onClick={() => void start()}>
            <Camera size={18} /> {photo ? "Retake with Camera" : "Open Camera"}
          </button>
        )}
        {(active || waiting) && (
          <button
            onClick={() => {
              stop();
              setActive(false);
              setWaiting(false);
            }}
          >
            Close Camera
          </button>
        )}
        {photo && (
          <>
            <a
              className="button"
              href={photo}
              download="bloom-and-letter-keepsake"
            >
              Download Photo
            </a>
            <button onClick={() => setPhoto("")}>Remove Photo</button>
          </>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      <label>
        Use your device camera or choose a photo
        <input
          type="file"
          accept="image/*"
          capture="user"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || !file.type.startsWith("image/")) return;
            stop();
            setActive(false);
            setWaiting(false);
            setMessage("");
            setPhoto(URL.createObjectURL(file));
          }}
        />
      </label>
    </section>
  );
}
