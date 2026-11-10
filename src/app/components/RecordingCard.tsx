"use client";

import { useRef, useState } from "react";
import type { Recording, Status } from "@/domain/recording";
import { setStatus, uploadTake } from "@/web/apiClient";

const STATUS_CLASS: Record<Status, string> = {
  "Para gravar": "pill todo",
  Gravando: "pill doing",
  Gravado: "pill done",
  "Não veio": "pill missed",
};

interface RecordingCardProps {
  recording: Recording;
  onChanged: () => Promise<void>;
}

export function RecordingCard({ recording, onChanged }: RecordingCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pastingLink, setPastingLink] = useState(false);
  const [link, setLink] = useState("");

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setMessage("");
    try {
      const done = await action();
      if (done) setMessage(done);
      await onChanged();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Algo deu errado.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const upload = (file: File) =>
    run(async () => {
      setProgress(0);
      const outcome = await uploadTake(recording.key, file, setProgress);
      return outcome.kind === "duplicate"
        ? `Esse vídeo já estava no Drive como ${outcome.fileName}.`
        : `Subiu como ${outcome.fileName}.`;
    });

  const changeStatus = (status: Status, driveLink?: string) =>
    run(async () => {
      await setStatus(recording.key, status, driveLink);
    });

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h2>{recording.key.name}</h2>
          <p className="muted">{[recording.kind, recording.organization].filter(Boolean).join(" · ")}</p>
        </div>
        <span className={STATUS_CLASS[recording.status]}>{recording.status}</span>
      </div>

      {recording.series && <p className="series">{recording.series}</p>}
      {recording.question && <blockquote className="question">{recording.question}</blockquote>}
      {recording.whereWhen && <p className="where">{recording.whereWhen}</p>}

      <p className="meta">
        {recording.priority && <span className={`priority ${recording.priority.toLowerCase()}`}>{recording.priority}</span>}
        {recording.videoOwner && <span>Vídeo: {recording.videoOwner}</span>}
        {recording.photoOwner && <span>Fotos: {recording.photoOwner}</span>}
      </p>
      {recording.notes && <p className="notes">{recording.notes}</p>}
      {recording.driveLink && (
        <a className="drive-link" href={recording.driveLink} target="_blank" rel="noreferrer">Abrir no Drive</a>
      )}

      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
      {message && <p className="feedback">{message}</p>}

      <input
        ref={fileInput}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="actions">
        <button className="button primary" disabled={busy} onClick={() => fileInput.current?.click()}>Subir vídeo</button>
        <button className="button" disabled={busy} onClick={() => setPastingLink((open) => !open)}>Colar link</button>
        {recording.status !== "Não veio" && (
          <button className="button" disabled={busy} onClick={() => void changeStatus("Não veio")}>Não veio</button>
        )}
        {recording.status !== "Para gravar" && (
          <button className="button ghost" disabled={busy} onClick={() => void changeStatus("Para gravar")}>Desfazer</button>
        )}
      </div>

      {pastingLink && (
        <form
          className="paste"
          onSubmit={(event) => {
            event.preventDefault();
            void changeStatus("Gravado", link).then(() => setPastingLink(false));
          }}
        >
          <input type="url" placeholder="https://drive.google.com/…" value={link} onChange={(event) => setLink(event.target.value)} required />
          <button className="button primary" disabled={busy} type="submit">Salvar</button>
        </form>
      )}
    </article>
  );
}
