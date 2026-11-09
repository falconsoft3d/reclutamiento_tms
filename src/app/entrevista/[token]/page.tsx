import { Suspense } from "react";
import type { Metadata } from "next";
import { container } from "@/components/ui";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Entrevista en línea" };

export default function EntrevistaPage({ params }: PageProps<"/entrevista/[token]">) {
  return (
    <section className="bg-gris-claro py-10 sm:py-14">
      <div className={`${container} max-w-3xl`}>
        <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-md bg-white" />}>
          <ChatConToken params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function ChatConToken({ params }: { params: PageProps<"/entrevista/[token]">["params"] }) {
  const { token } = await params;
  return <Chat token={token} />;
}
