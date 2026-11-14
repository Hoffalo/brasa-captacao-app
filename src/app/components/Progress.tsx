"use client";

import { progressByOwner } from "@/domain/dashboard";
import type { Status } from "@/domain/recording";
import type { Board } from "@/web/apiClient";

const STATUS_MARK: Record<Status, { icon: string; className: string }> = {
  "Para gravar": { icon: "○", className: "mark todo" },
  Gravando: { icon: "●", className: "mark doing" },
  Gravado: { icon: "✓", className: "mark done" },
  "Não veio": { icon: "✕", className: "mark missed" },
};

/** Coordinator view: one bar per video owner and every person under it with their status. */
export function Progress({ board }: { board: Board }) {
  const owners = progressByOwner(board.recordings);
  const recorded = owners.reduce((sum, owner) => sum + owner.recorded, 0);
  const total = owners.reduce((sum, owner) => sum + owner.total, 0);

  return (
    <section className="panel">
      <p className="progress-total">{recorded} de {total} captados</p>
      {owners.map((owner) => {
        const percent = (count: number) => (owner.total > 0 ? (count / owner.total) * 100 : 0);
        return (
          <details key={owner.owner} className="owner-progress" open>
            <summary>
              <div className="meter-label">
                <span>{owner.owner}</span>
                <span>
                  {owner.recorded} de {owner.total}
                  {owner.missed > 0 ? ` · ${owner.missed} não veio` : ""}
                </span>
              </div>
              <div className="meter-bar stacked">
                <div className="done" style={{ width: `${percent(owner.recorded)}%` }} />
                <div className="missed" style={{ width: `${percent(owner.missed)}%` }} />
              </div>
            </summary>
            <ul className="people">
              {owner.recordings.map((recording) => {
                const mark = STATUS_MARK[recording.status];
                return (
                  <li key={`${recording.key.tab}/${recording.key.name}`}>
                    <span className={mark.className} aria-label={recording.status}>{mark.icon}</span>
                    <span className="person">
                      {recording.driveLink
                        ? <a href={recording.driveLink} target="_blank" rel="noreferrer">{recording.key.name}</a>
                        : recording.key.name}
                    </span>
                    <span className="muted">{recording.series || recording.status}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
