"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Radio,
  ShieldCheck,
  Sparkles,
  ArrowDown,
  SlidersHorizontal,
  Feather,
  LockKeyhole,
} from "lucide-react";
import { Composer } from "@/components/blog/composer";
import { PostCard } from "@/components/blog/post-card";
import { DEFAULT_API_ENDPOINT, type Post } from "@/lib/blog/moderation";
export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [endpoint, setEndpoint] = useState(DEFAULT_API_ENDPOINT);
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
          <Link
            href="/"
            aria-label="Neon início"
            className="flex items-center gap-3"
          >
            <span className="logo-mark">
              <Radio size={22} />
            </span>
            <span className="text-2xl font-black tracking-[-.08em]">
              neon<span className="text-primary">.</span>
            </span>
            <span className="ml-5 hidden border-l border-border pl-5 text-xs tracking-[.16em] text-muted-foreground sm:block">
              AI CONTENT MONITOR
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole size={15} />
            <span>Sessão temporária</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <div className="mb-9">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[.2em] text-primary">
            <span className="h-px w-6 bg-primary" /> ESPAÇO PARA SUAS IDEIAS
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Compartilhe. <span className="text-[#9693ad]">Com cuidado.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Um pequeno blog. Boas conversas. Conteúdo moderado por IA.
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_290px]">
          <section aria-label="Publicar e ler posts" className="min-w-0">
            <Composer
              endpoint={endpoint}
              onPublish={(post) => setPosts((current) => [post, ...current])}
            />
            <div className="mb-5 mt-10 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-lg font-semibold">
                Seu feed{" "}
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                  {posts.length.toString().padStart(2, "0")}
                </span>
              </h2>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                Mais recentes <ArrowDown size={14} />
              </span>
            </div>
            <div aria-live="polite" className="space-y-5">
              {posts.length ? (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="empty-feed py-14 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                    <Feather size={25} />
                  </div>
                  <h3 className="font-medium">A primeira palavra é sua.</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Publique uma ideia. Os posts aprovados vão aparecer por
                    aqui.
                  </p>
                </div>
              )}
            </div>
          </section>
          <aside className="space-y-6">
            <div className="panel p-6">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="text-primary" size={22} />
                <h2 className="font-semibold">Antes de ir ao ar</h2>
              </div>
              <ol className="space-y-6">
                {[
                  [
                    "01",
                    "Você compartilha",
                    "Escreva um texto, escolha uma imagem ou combine os dois.",
                  ],
                  [
                    "02",
                    "A IA analisa",
                    "O conteúdo é verificado antes da publicação.",
                  ],
                  [
                    "03",
                    "O feed recebe",
                    "Se aprovado, seu post aparece nesta sessão.",
                  ],
                ].map(([n, title, desc]) => (
                  <li key={n} className="flex gap-3">
                    <span className="pt-1 font-mono text-xs text-primary/70">
                      {n}
                    </span>
                    <div>
                      <h3 className="text-sm font-medium">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="px-2">
              <Sparkles size={21} className="mb-3 text-[#bfa6ff]" />
              <h2 className="text-sm font-medium">Só existe por agora.</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Os posts ficam apenas na memória desta página e somem ao
                recarregar. O conteúdo é enviado ao serviço de IA para análise.
              </p>
            </div>
            <details className="panel p-5 hidden">
              <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal size={15} /> Conexão com a API
              </summary>
              <label
                htmlFor="api-url"
                className="mb-2 mt-4 block text-xs text-muted-foreground"
              >
                Endereço da API
              </label>
              <input
                id="api-url"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full rounded-lg border border-border bg-black/20 p-2 text-sm"
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                A conexão com o Azure já está configurada. O endereço padrão é
                /api/backend. Alterações valem apenas para esta sessão.
              </p>
            </details>
          </aside>
        </div>
        <footer className="mt-16 flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>neon. / um experimento de publicação consciente</span>
          <span>Powered by Azure AI Content Safety</span>
        </footer>
      </main>
    </div>
  );
}
