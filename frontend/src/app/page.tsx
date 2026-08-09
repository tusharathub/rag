"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, X, Check, ArrowRight, FileText, Database, Zap, ShieldCheck, Cpu } from "lucide-react";
import { cn } from "@/utils/cn";

export default function LandingPage() {
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0); // 01 open by default

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setWaitlistOpen(false);
    }, 2000);
  };

  const faqItems = [
    {
      num: "01",
      q: "What is this RAG System?",
      a: "This is an enterprise Retrieval-Augmented Generation (RAG) platform built on Hexagonal Architecture. It processes multi-format documents, executes sub-10ms pgvector dense similarity queries, filters candidates with Cohere v3 reranking, and streams grounded LLM responses."
    },
    {
      num: "02",
      q: "How does pgvector handle 1536-dimensional embeddings?",
      a: "We store OpenAI text-embedding-3-small vectors (1536 dimensions) inside PostgreSQL using the pgvector extension with HNSW cosine distance indexing, enabling high-precision retrieval across massive document collections."
    },
    {
      num: "03",
      q: "Why is Cohere Rerank v3 required over raw vector search?",
      a: "Vector similarity search alone retrieves semantic matches but often includes irrelevant noise. Cohere v3 reranking scores candidate chunks, dropping low-confidence results before prompt assembly to eliminate hallucinations."
    },
    {
      num: "04",
      q: "How are multi-format documents (PDF, DOCX, XLSX, PPTX) ingested?",
      a: "Our document parser factory handles PDF, DOCX, XLSX, PPTX, Markdown, HTML, CSV, JSON, and TXT files, cleaning headers/footers and applying a 500-token window with 50-token overlap chunking."
    },
    {
      num: "05",
      q: "Is document data strictly isolated across user collections?",
      a: "Yes. Collection IDs act as hard tenant boundaries in PostgreSQL. Every similarity search query and retrieval pass is strictly scoped by collection ownership."
    },
    {
      num: "06",
      q: "How does prompt token budgeting work?",
      a: "The PromptBuilder calculates the exact context window of the target LLM (e.g. gpt-4o-mini), allocating 70% of tokens to reranked chunks wrapped in XML (<context><document>...</document></context>) and 30% to chat history."
    },
    {
      num: "07",
      q: "Can I launch and test the RAG workspace right now?",
      a: "Yes! Click 'Launch Workspace' to jump straight into the live interactive RAG engine workspace, upload test files, manage collections, and stream RAG chat sessions."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 font-sans selection:bg-[#FFA028] selection:text-black overflow-x-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* HERO BANNER SECTION (Warm Amber Gold Palette #FFA028) */}
      {/* ------------------------------------------------------------- */}
      <header className="relative bg-[#FFA028] text-black border-b border-[#E58D1B] scanlines bg-tech-grid pb-24 pt-6 px-6">
        
        {/* Navigation Bar */}
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-md bg-black flex items-center justify-center text-[#FFA028]">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono text-xl font-black tracking-tighter text-black">
                DOCS<span className="text-black/60"> </span>ORBIT
              </span>
              <span className="block text-[9px] font-mono text-black/70 -mt-1 tracking-widest uppercase font-bold">
                RETRIEVAL-AUGMENTED GENERATION
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-6 font-mono text-xs tracking-wider">
            <a href="#problem" className="text-black/80 hover:text-black transition-colors font-bold">
              [ THE PROBLEM ]
            </a>
            <a href="#architecture" className="text-black/80 hover:text-black transition-colors font-bold">
              [ ARCHITECTURE ]
            </a>
            {/* <button
              onClick={() => setWaitlistOpen(true)}
              className="px-4 py-2 bg-black text-white font-mono text-xs font-bold tracking-wider hover:bg-slate-900 transition-all clip-chamfer shadow-md"
            >
              Get API Keys
            </button> */}
          </div>
        </div>

        {/* Hero Body */}
        <div className="max-w-7xl mx-auto pt-14 pb-10 space-y-8">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/10 border border-black/20 font-mono text-xs font-bold tracking-widest text-black uppercase rounded-full">
            <span>●</span> PRODUCTION-GRADE RAG STACK • PGVECTOR + COHERE V3
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-black leading-[0.95] max-w-6xl uppercase">
            Sculpting Context. <br />
            No Hallucinations. <br />
            Zero Token Waste.
          </h1>

          <p className="text-base sm:text-xl text-black/90 font-mono max-w-3xl leading-relaxed font-medium">
            An end-to-end RAG platform. Ingest multi-format documents (PDF, DOCX, XLSX, PPTX), execute 1536-dimensional pgvector cosine search, filter noise with Cohere v3 reranking, and stream grounded answers.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <Link href="/workspace">
              <button className="px-7 py-4 bg-black text-white font-mono text-xs font-bold tracking-widest hover:bg-slate-900 transition-all clip-chamfer shadow-2xl flex items-center gap-2 group">
                <span>LAUNCH WORKSPACE</span>
                <ArrowRight className="h-4 w-4 text-[#FFA028] group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            {/* <button
              onClick={() => setWaitlistOpen(true)}
              className="px-7 py-4 bg-transparent text-black font-mono text-xs font-bold tracking-widest border-2 border-black/80 hover:bg-black/10 transition-all clip-chamfer"
            >
              Join Waitlist
            </button> */}
          </div>
        </div>

        {/* Running Ticker Ribbon */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-black/20 bg-black/10 py-2.5 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap font-mono text-[11px] font-bold tracking-widest text-black flex items-center gap-8 uppercase">
            <span>• MULTI-FORMAT INGESTION (PDF/DOCX/XLSX/PPTX)</span>
            <span>•</span>
            <span>PGVECTOR 1536D COSINE SEARCH</span>
            <span>•</span>
            <span>COHERE V3 RE-RANKING</span>
            <span>•</span>
            <span>500-TOKEN OVERLAP CHUNKING</span>
            <span>•</span>
            <span>REDIS EMBEDDING CACHE</span>
            <span>•</span>
            <span>70/30 TOKEN BUDGET PROMPT</span>
            <span>•</span>
            <span>FASTAPI SSE STREAMING</span>
            <span>•</span>
            <span>MULTI-FORMAT INGESTION (PDF/DOCX/XLSX/PPTX)</span>
            <span>•</span>
            <span>PGVECTOR 1536D COSINE SEARCH</span>
            <span>•</span>
            <span>COHERE V3 RE-RANKING</span>
            <span>•</span>
            <span>500-TOKEN OVERLAP CHUNKING</span>
            <span>•</span>
            <span>REDIS EMBEDDING CACHE</span>
            <span>•</span>
            <span>70/30 TOKEN BUDGET PROMPT</span>
            <span>•</span>
            <span>FASTAPI SSE STREAMING</span>
          </div>
        </div>
      </header>

      {/* Overlapping Section Tag: ✕ THE RAG PROBLEM */}
      <div className="relative z-10 flex justify-center mt-9">
        <div className="px-4 py-1.5 bg-[#0A0A0A] border border-[#FFA028]/50 font-mono text-xs tracking-widest text-[#FFA028] uppercase flex items-center gap-2 shadow-lg">
          <span>✕</span> THE RAG PROBLEM
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* THE PROBLEM SECTION (Dark Grid & Vector Radar) */}
      {/* ------------------------------------------------------------- */}
      <section id="problem" className="py-20 px-6 border-b border-slate-900 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
              You don't own your prompt context. <br />
              <span className="text-[#FFA028]">And your LLM is guessing.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border border-slate-900 bg-[#0C0C0C]">        

            {/* Right Column: 4 Quadrants Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900 border-slate-900">
              
              <div className="flex flex-col justify-between divide-y divide-slate-900">
                {/* 001 */}
                <div className="p-8 space-y-3">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#FFA028] tracking-widest uppercase">
                    <span>CONTEXT DILUTION</span>
                    <span className="text-slate-700">001</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">They stuff prompts blindly.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Un-reranked vector search brings irrelevant text blocks. Noise pollutes LLM context windows and explodes cloud billing.
                  </p>
                </div>

                {/* 003 */}
                <div className="p-8 space-y-3">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#FFA028] tracking-widest uppercase">
                    <span>TENANT LEAKAGE</span>
                    <span className="text-slate-700">003</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">No collection boundaries.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Un-partitioned vector indices allow proprietary team documents to cross multi-tenant user boundaries.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between divide-y divide-slate-900">
                {/* 002 */}
                <div className="p-8 space-y-3">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#FFA028] tracking-widest uppercase">
                    <span>SILENT HALLUCINATIONS</span>
                    <span className="text-slate-700">002</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">They output confident lies.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Standard similarity search misses exact semantic nuances. Without Cohere v3 reranking, models make up details.
                  </p>
                </div>

                {/* 004 */}
                <div className="p-8 space-y-3">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#FFA028] tracking-widest uppercase">
                    <span>UN-CACHED EMBEDDINGS</span>
                    <span className="text-slate-700">004</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Slow completion loops.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Un-cached embedding API requests introduce seconds of delay, ruining real-time chat interactions.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ARCHITECTURE & RAG PIPELINE SECTION */}
      {/* ------------------------------------------------------------- */}
      <section id="architecture" className="py-20 px-6 border-b border-slate-900 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* RAG Pipeline Main Card */}
          <div className="border border-slate-900 bg-[#0C0C0C] grid grid-cols-1 lg:grid-cols-12 items-center">
            
            {/* Left RAG Visual Pipeline */}
            <div className="lg:col-span-6 p-8 border-b lg:border-b-0 lg:border-r border-slate-900 flex flex-col items-center justify-center py-12">
              <div className="w-full max-w-sm space-y-4 font-mono text-center text-xs">
                <div className="p-3 border border-slate-800 bg-slate-950 text-slate-300 tracking-widest flex items-center justify-between">
                  <span>DOCUMENT INGESTION</span>
                  <span className="text-[#FFA028]">PDF / DOCX / XLSX</span>
                </div>

                <div className="text-[#FFA028]">↓ TokenAwareChunker (500 tokens / 50 overlap)</div>

                <div className="p-3 border border-slate-800 bg-slate-950 text-slate-300 tracking-widest flex items-center justify-between">
                  <span>PGVECTOR COSINE MATCH</span>
                  <span className="text-[#FFA028]">1536 Dimensions</span>
                </div>

                <div className="text-[#FFA028]">↓ Cohere v3.0 Rerank Filter</div>

                <div className="p-4 border border-[#FFA028]/60 bg-black text-white tracking-widest space-y-1">
                  <div className="font-bold text-[#FFA028]">XML PROMPT BUDGET</div>
                  <div className="text-slate-400 text-[10px]">70% Context / 30% History</div>
                </div>
              </div>
            </div>

            {/* Right Architecture Copy */}
            <div className="lg:col-span-6 p-12 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
                <span>⚡</span> RAG ARCHITECTURE
              </div>

              <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
                Deterministic Ingestion
              </h2>

              <p className="text-base text-slate-400 leading-relaxed font-sans max-w-md">
                Sub-10ms similarity match, Cohere v3 noise filtering, and token-budgeted streaming LLM prompts.
              </p>
            </div>

          </div>

          {/* 3 Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="border border-slate-900 bg-[#0C0C0C] p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
                <span>💳</span> TOKEN BUDGET
              </div>
              <h3 className="text-2xl font-bold text-white">70/30 Context Budget</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                70% of prompt tokens are allocated to reranked source context inside XML tags, preventing context truncation.
              </p>
            </div>

            <div className="border border-slate-900 bg-[#0C0C0C] p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
                <span>🔒</span> TENANT ISOLATION
              </div>
              <h3 className="text-2xl font-bold text-white">SHA-256 & Scopes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collection ID boundaries enforce strict multi-tenant data partitioning so team datasets never cross.
              </p>
            </div>

            <div className="border border-slate-900 bg-[#0C0C0C] p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
                <span>⏱</span> SUB-10MS LATENCY
              </div>
              <h3 className="text-2xl font-bold text-white">pgvector + Redis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Redis 7-day TTL embedding cache and PostgreSQL HNSW cosine indices deliver rapid vector retrieval.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ENGINEERED RAG TERMINAL UI */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 px-6 border-b border-slate-900 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
              <span>⚡</span> RAG TERMINAL
            </div>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
              Built for RAG engineers
            </h2>
          </div>

          {/* Terminal Box Frame */}
          <div className="relative max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
            
            {/* Left Annotations */}
            <div className="hidden lg:block lg:col-span-3 text-left font-mono text-[11px] space-y-8 text-slate-500">
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">MULTI-FORMAT PARSER</div>
                <div>PDF, DOCX, XLSX, PPTX, MD</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">TOKEN-AWARE CHUNKER</div>
                <div>500 TOKENS / 50 OVERLAP</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">PGVECTOR COSINE</div>
                <div>SUB-10MS HNSW SEARCH</div>
              </div>
            </div>

            {/* Center Terminal Box */}
            <div className="lg:col-span-6 border border-slate-800 bg-[#0C0C0C] rounded-lg overflow-hidden shadow-2xl text-left font-mono text-xs">
              
              {/* Terminal Window Header */}
              <div className="bg-[#141414] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[11px] text-slate-400">
                  DOCSORBIT://LOCALHOST · VECTOR ENGINE ACTIVE
                </div>
                <div className="h-2 w-2 rounded-full bg-[#FFA028]" />
              </div>

              {/* Terminal Content */}
              <div className="p-6 space-y-4 leading-relaxed text-slate-300 min-h-[300px]">
                <div className="text-[#FFA028] font-bold">
                  λ rag init --collection enterprise-docs
                </div>

                {/* ASCII Art Logo */}
                <pre className="text-[#FFA028] font-bold text-[10px] leading-tight select-none">
{`███████   █████   ██████ 
██   ██  ██   ██  ██     
███████  ███████  ██  ███
██   ██  ██   ██  ██   ██
██   ██  ██   ██  ██████`}
                </pre>

                <div className="space-y-1 text-slate-400 text-[11px]">
                  <p>&gt; Parsing multi-format inputs: PDF, DOCX, XLSX, PPTX...</p>
                  <p>&gt; TokenAwareChunker (500 token window / 50 token overlap)...</p>
                  <p>&gt; Generating 1536d vectors (text-embedding-3-small)... <span className="text-[#FFA028] font-bold">OK</span></p>
                  <p>&gt; Indexing 42 chunks into PostgreSQL pgvector table...</p>
                  <p>&gt; Cohere Rerank v3.0 initialized.</p>
                </div>

                <div className="pt-2 text-xs">
                  <span className="text-emerald-500 font-bold">✓ System Ready.</span> <span className="text-slate-400">Cosine Index:</span> <span className="text-[#FFA028]">HNSW</span> · <span className="text-slate-400">Reranker:</span> <span className="text-[#FFA028]">ACTIVE</span>
                </div>

                <div className="text-[#FFA028] font-bold flex items-center gap-1 pt-2">
                  <span>λ</span> rag stream --query "Explain failover architecture" --llm gpt-4o-mini
                  <span className="h-4 w-2 bg-[#FFA028] animate-pulse inline-block" />
                </div>
              </div>

              {/* Terminal Footer */}
              <div className="bg-[#141414] px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span>PGVECTOR</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFA028]" />
                <span>COHERE V3</span>
                <span>SSE STREAM</span>
              </div>
            </div>

            {/* Right Annotations */}
            <div className="hidden lg:block lg:col-span-3 text-left font-mono text-[11px] space-y-8 text-slate-500">
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">COHERE RE-RANK V3</div>
                <div>DROPS LOW-RELEVANCE NOISE</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">PROMPT BUDGETING</div>
                <div>70% CONTEXT / 30% HISTORY</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold tracking-widest">SSE LLM STREAMING</div>
                <div>FASTAPI &amp; OPENAI GPT-4O</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* RAG FAQ ACCORDION */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20 px-6 border-b border-slate-900 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-800 bg-slate-950 font-mono text-xs text-[#FFA028]">
              <span>❓</span> RAG FAQ
            </div>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
              Frequently asked questions.
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border-b border-slate-900 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-6 text-left flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-6">
                      {/* <span className="font-mono text-xs text-[#FFA028] font-bold">{item.num}</span> */}
                      <span className="text-lg sm:text-xl font-bold text-white group-hover:text-[#FFA028] transition-colors">
                        {item.q}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-slate-500 transition-transform duration-200 flex-shrink-0",
                        isOpen && "transform rotate-180 text-[#FFA028]"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="pb-6 pl-12 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-3xl animate-in fade-in duration-150">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#050505] py-12 px-6 border-t border-slate-900 font-mono text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-base">DOCS ORBIT</span>
            <span>· VECTOR RETRIEVAL PLATFORM</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#problem" className="hover:text-white transition-colors">THE PROBLEM</a>
            <a href="#architecture" className="hover:text-white transition-colors">ARCHITECTURE</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="https://www.linkedin.com/in/tushar-nailwal/" target="_blank" className="hover:text-white transition-colors">LinkedIn</a>
            <Link href="/workspace" className="text-[#FFA028] hover:underline font-bold">LAUNCH WORKSPACE</Link>
          </div>

          <div>
            © 2026 DOCS ORBIT. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

      {/* WAITLIST MODAL */}
      {waitlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0B0B0B] border border-[#FFA028]/50 rounded-lg p-6 shadow-2xl space-y-6 relative clip-chamfer">
            <button
              onClick={() => setWaitlistOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2 font-mono">
              <div className="text-[#FFA028] text-xs font-bold tracking-widest uppercase">
                DOCS ORBIT ACCESS
              </div>
              <h3 className="text-2xl font-bold text-white font-sans">Get API Keys & Access</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Request access to the production RAG backend, pgvector indices, and streaming copilot API.
              </p>
            </div>

            {submitted ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded text-center space-y-2 font-mono">
                <Check className="h-6 w-6 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">Request Received</p>
                <p className="text-xs text-emerald-300">We'll send API credentials to your email.</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-4 font-mono">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="engineer@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FFA028]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#FFA028] hover:bg-[#E58D1B] text-black font-mono text-xs font-bold tracking-widest clip-chamfer transition-all shadow-[0_0_20px_#FFA028]"
                >
                  REQUEST API KEYS
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
