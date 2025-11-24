"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useLocalQuery, updateQueryCache } from "../hooks/useLocalConvex";

type Todo = {
    _id: Id<"todos"> | string;
    text: string;
    isCompleted: boolean;
    createdAt: number;
};

function useTodos() {
    const todos = useLocalQuery(api.functions.list, {}) as Todo[] | undefined;
    const createMutation = useMutation(api.functions.create);
    const toggleMutation = useMutation(api.functions.toggle);
    const removeMutation = useMutation(api.functions.remove);

    const addTodo = async (text: string) => {
        if (!text.trim()) return;

        const tempId = `temp-${Date.now()}`;
        const newTodo: Todo = {
            _id: tempId,
            text,
            isCompleted: false,
            createdAt: Date.now(),
        };

        updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
            [newTodo, ...(current || [])]
        );

        try {
            await createMutation({ text });
        } catch (error) {
            console.error("Failed to add todo", error);

            updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
                (current || []).filter((t) => t._id !== tempId)
            );

            alert("Failed to save todo!");
        }
    };

    const toggleTodo = async (id: string | Id<"todos">, currentStatus: boolean) => {
        updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
            (current || []).map((t) =>
                t._id === id ? { ...t, isCompleted: !currentStatus } : t
            )
        );

        try {
            if (typeof id === "string" && id.startsWith("temp-")) {
                console.warn("Cannot toggle temporary todo");
                return;
            }

            await toggleMutation({ id: String(id) });
        } catch (error) {
            console.error("Failed to toggle todo", error);

            updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
                (current || []).map((t) =>
                    t._id === id ? { ...t, isCompleted: currentStatus } : t
                )
            );
        }
    };

    const removeTodo = async (id: string | Id<"todos">) => {
        const todoToRemove = (todos || []).find((t) => t._id === id);

        updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
            (current || []).filter((t) => t._id !== id)
        );

        try {
            if (typeof id === "string" && id.startsWith("temp-")) {
                return;
            }

            await removeMutation({ id: String(id) });
        } catch (error) {
            console.error("Failed to remove todo", error);

            if (todoToRemove) {
                updateQueryCache(api.functions.list, {}, (current: Todo[] | undefined) =>
                    [todoToRemove, ...(current || [])]
                );
            }
        }
    };

    return {
        todos: todos || [],
        addTodo,
        toggleTodo,
        removeTodo
    };
}

function TodoItem({
    todo,
    onToggle,
    onRemove
}: {
    todo: Todo;
    onToggle: (id: string | Id<"todos">, status: boolean) => void;
    onRemove: (id: string | Id<"todos">) => void;
}) {
    const isOptimistic = typeof todo._id === "string" && todo._id.startsWith("temp-");

    return (
        <li
            className={`p-4 bg-white border rounded-lg shadow-sm flex justify-between items-center transition-all ${isOptimistic ? "opacity-70" : "opacity-100"
                }`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => onToggle(todo._id, todo.isCompleted)}
                    className="w-5 h-5 cursor-pointer accent-blue-600"
                />
                <span
                    className={`truncate ${todo.isCompleted ? "line-through text-gray-400" : "text-gray-800"
                        }`}
                >
                    {todo.text}
                </span>
            </div>

            <button
                onClick={() => onRemove(todo._id)}
                className="text-red-500 hover:text-red-700 px-2 text-sm font-semibold"
            >
                Delete
            </button>
        </li>
    );
}

export function AddTodo({ onAdd }: { onAdd: (text: string) => void }) {
    const [text, setText] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText("");
    };

    return (
        <div className="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg border border-gray-100">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What needs to be done?"
                    className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors"
                >
                    Add
                </button>
            </form>
        </div>
    );
}

export function TodoList({
    todos,
    onToggle,
    onRemove
}: {
    todos: Todo[];
    onToggle: (id: string | Id<"todos">, status: boolean) => void;
    onRemove: (id: string | Id<"todos">) => void;
}) {
    return (
        <div className="max-w-md mx-auto mt-6">
            <h2 className="text-xl font-bold mb-4 text-gray-700">
                Tasks ({todos.length})
            </h2>

            {todos.length === 0 && (
                <p className="text-gray-400 text-center">No tasks yet.</p>
            )}

            <ul className="space-y-3">
                {todos.map((todo) => (
                    <TodoItem
                        key={todo._id}
                        todo={todo}
                        onToggle={onToggle}
                        onRemove={onRemove}
                    />
                ))}
            </ul>
        </div>
    );
}

export function TodoApp() {
    const { todos, addTodo, toggleTodo, removeTodo } = useTodos();

    return (
        <>
            <AddTodo onAdd={addTodo} />
            <TodoList
                todos={todos}
                onToggle={toggleTodo}
                onRemove={removeTodo}
            />
        </>
    );
}
