import { auth, signIn, signOut } from "@/auth";
import { CaptureApp } from "./components/CaptureApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const conference = process.env.CONFERENCE_NAME || "Conferência BRASA";

  if (!session?.user) {
    return (
      <main className="signin">
        <p className="eyebrow">{conference}</p>
        <h1>Captação</h1>
        <p>Entre com a sua conta @gobrasa.org para ver suas gravações e subir os vídeos.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="button primary" type="submit">Entrar com Google</button>
        </form>
      </main>
    );
  }

  return (
    <CaptureApp
      conference={conference}
      userName={session.user.name ?? ""}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
