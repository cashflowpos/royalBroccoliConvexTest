"use client";

import { TodoApp } from "./components/TodoComponents";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-slate-800 mb-2">
          Convex Todo Challenge
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Optimistic Updates & Local Persistence for Todo List
        </p>

        <div className="space-y-6">
          <TodoApp />
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          Challenge Completed by Wittawas Sujimongkol
        </div>
      </div>
    </main>
  );
}