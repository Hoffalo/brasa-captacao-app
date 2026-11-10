"use client";

import { bySchedule, highPriorityPending, pendingByOwner, seriesProgress } from "@/domain/dashboard";
import type { Board } from "@/web/apiClient";

/** Coordination view: series against their goals, load per person, high-priority people still open. */
export function Panel({ board }: { board: Board }) {
  const progress = seriesProgress(board.recordings, board.goals).filter((series) => series.listed > 0);
  const loads = pendingByOwner(board.recordings);
  const urgent = highPriorityPending(board.recordings).sort(bySchedule);

  return (
    <section className="panel">
      <h2>Séries</h2>
      {progress.map((series) => {
        const target = series.goal ?? series.listed;
        const fraction = target > 0 ? Math.min(series.recorded / target, 1) : 0;
        return (
          <div key={series.series} className="meter">
            <div className="meter-label">
              <span>{series.series}</span>
              <span>{series.recorded} de {series.goal ?? series.listed}{series.goal ? " (meta)" : ""}</span>
            </div>
            <div className="meter-bar"><div style={{ width: `${fraction * 100}%` }} /></div>
          </div>
        );
      })}

      <h2>Por pessoa</h2>
      <table className="loads">
        <thead><tr><th>Vídeo</th><th>Pendentes</th><th>Feitas</th></tr></thead>
        <tbody>
          {loads.map((load) => (
            <tr key={load.owner}><td>{load.owner}</td><td>{load.pending}</td><td>{load.done}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Prioridade alta em aberto</h2>
      {urgent.length === 0 && <p className="muted">Todas as prioridades altas já foram resolvidas.</p>}
      <ul className="urgent">
        {urgent.map((recording) => (
          <li key={`${recording.key.tab}/${recording.key.name}`}>
            <strong>{recording.key.name}</strong>
            <span className="muted">{recording.isAnchor ? "Monking" : recording.videoOwner} · {recording.whereWhen}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
