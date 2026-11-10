"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { bySchedule } from "@/domain/dashboard";
import { isResolved, type Recording } from "@/domain/recording";
import { EXTERNAL_VIDEOMAKER } from "@/domain/sheetLayout";
import { ApiError, loadBoard, type Board } from "@/web/apiClient";
import { Panel } from "./Panel";
import { RecordingCard } from "./RecordingCard";

type View = "mine" | "all" | "panel";

const PERSON_STORAGE_KEY = "captacao.pessoa";
// The sheet is edited by several people at once; a minute keeps the list fresh without hammering the API.
const REFRESH_INTERVAL_MS = 60_000;

function readStoredPerson(): string {
  try {
    return window.localStorage.getItem(PERSON_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePerson(person: string): void {
  try {
    window.localStorage.setItem(PERSON_STORAGE_KEY, person);
  } catch {
    // private mode: the choice just lasts until the page reloads
  }
}

/** Picks the team member whose first and last names match the Google account name. */
function guessPerson(userName: string, people: string[]): string {
  const words = userName.toLowerCase().split(/\s+/).filter(Boolean);
  return people.find((person) => {
    const parts = person.toLowerCase().split(/\s+/);
    return words[0] === parts[0] && (words.length < 2 || parts.includes(words[words.length - 1]));
  }) ?? "";
}

interface CaptureAppProps {
  conference: string;
  userName: string;
  signOutAction: () => Promise<void>;
}

export function CaptureApp({ conference, userName, signOutAction }: CaptureAppProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [person, setPerson] = useState("");
  const [view, setView] = useState<View>("mine");
  const [showDone, setShowDone] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setBoard(await loadBoard());
      setError("");
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) window.location.reload();
      setError(failure instanceof Error ? failure.message : "Não consegui carregar a planilha.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const people = useMemo(() => {
    const owners = new Set((board?.recordings ?? []).map((recording) => recording.videoOwner));
    owners.delete(EXTERNAL_VIDEOMAKER);
    owners.delete("");
    return [...owners].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [board]);

  useEffect(() => {
    if (person || people.length === 0) return;
    setPerson(readStoredPerson() || guessPerson(userName, people));
  }, [people, person, userName]);

  const choosePerson = (value: string) => {
    setPerson(value);
    storePerson(value);
  };

  const visible = useMemo(() => {
    const recordings = (board?.recordings ?? []).filter((recording) => !recording.isAnchor);
    const scoped = view === "mine" ? recordings.filter((recording) => recording.videoOwner === person) : recordings;
    return scoped.filter((recording) => showDone || !isResolved(recording)).sort(bySchedule);
  }, [board, view, person, showDone]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">{conference}</p>
          <h1>Captação</h1>
        </div>
        <form action={signOutAction}>
          <button className="link-button" type="submit">Sair</button>
        </form>
      </header>

      <nav className="tabs" aria-label="Visões">
        {([["mine", "Minhas"], ["all", "Todas"], ["panel", "Painel"]] as const).map(([value, label]) => (
          <button key={value} className={view === value ? "tab active" : "tab"} onClick={() => setView(value)}>
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="alert">{error}</p>}
      {!board && !error && <p className="muted center">Carregando a planilha…</p>}

      {board && view !== "panel" && (
        <section className="list">
          <div className="filters">
            {view === "mine" && (
              <label>
                Quem grava?
                <select value={person} onChange={(event) => choosePerson(event.target.value)}>
                  <option value="">Escolha seu nome</option>
                  {people.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox">
              <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
              Mostrar gravados e "não veio"
            </label>
          </div>
          {visible.length === 0 && <p className="muted center">Nada pendente por aqui.</p>}
          {visible.map((recording: Recording) => (
            <RecordingCard key={`${recording.key.tab}/${recording.key.name}`} recording={recording} onChanged={refresh} />
          ))}
        </section>
      )}

      {board && view === "panel" && <Panel board={board} />}
    </div>
  );
}
