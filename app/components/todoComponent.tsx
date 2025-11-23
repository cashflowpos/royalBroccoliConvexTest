"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api"; 
import { Id } from "../../convex/_generated/dataModel";

type Todo = {
  _id: Id<"todos"> | string; 
  text: string;
  isCompleted: boolean;
  createdAt: number;
};

type RemoteTodo = {
  _id: Id<"todos">;
  text: string;
  isCompleted: boolean;
  createdAt: number;
};

const LOCAL_STORAGE_KEY = "convex-todo-cache";

function useTodoStore() {
  
  const remoteTodos = useQuery(api.functions.list);
  const createMutation = useMutation(api.functions.create);
  const toggleMutation = useMutation(api.functions.toggle);
  const removeMutation = useMutation(api.functions.remove);

 
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Todo[];
          return parsed;
        } catch {
      
        }
      }
    }
    return [];
  });

  const todoMap = new Map<string, RemoteTodo>();
  if (remoteTodos) {
    remoteTodos.forEach((todo: RemoteTodo) => {
      todoMap.set(String(todo._id), todo);
    });
  }


  useEffect(() => {
    if (remoteTodos) {

      const todosWithIds = remoteTodos.map((todo: RemoteTodo) => ({
        ...todo,
        _id: todo._id as Id<"todos">,
      }));
   
      startTransition(() => {
        setTodos(todosWithIds as Todo[]); 
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todosWithIds));
        }
      });
    }
  }, [remoteTodos]);

  const addTodo = async (text: string) => {
    if (!text.trim()) return;

    
    const tempId = `temp-${Date.now()}`;
    const newTodo: Todo = {
      _id: tempId,
      text,
      isCompleted: false,
      createdAt: Date.now(),
    };

  
    const nextTodos = [newTodo, ...todos];
    setTodos(nextTodos);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTodos));
    }

    try {
     await createMutation({ text });
    } catch (error) {
      console.error("Failed to add todo", error);
      const rollbackTodos = todos.filter((t) => t._id !== tempId);
      setTodos(rollbackTodos);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rollbackTodos));
      }
      alert("Failed to save todo!");
    }
  };

   const toggleTodo = async (id: string | Id<"todos">, currentStatus: boolean) => {
   const previousTodos = [...todos];
   const nextTodos = todos.map((t) =>
      t._id === id ? { ...t, isCompleted: !currentStatus } : t
    );
    setTodos(nextTodos);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTodos));
    }

    try {
        if (typeof id === "string" && !id.startsWith("temp-")) {
          
            const remoteTodo = todoMap.get(String(id));
            if (remoteTodo && remoteTodo._id) {
               
                await toggleMutation({ id: remoteTodo._id });
            } else if (remoteTodos !== undefined) {
              
                console.warn(`Todo ID "${id}" not found in remote data, skipping mutation. Available IDs:`, Array.from(todoMap.keys()));
            }
        } else if (typeof id !== "string") {
            await toggleMutation({ id });
        }
    } catch (error) {
        console.error("Failed to toggle todo", error);
        setTodos(previousTodos);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(previousTodos));
        }
    }
  };
    const removeTodo = async (id: string | Id<"todos">) => {
    const previousTodos = [...todos];
    const nextTodos = todos.filter((t) => t._id !== id);
    setTodos(nextTodos);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTodos));
    }

    try {
        if (typeof id === "string" && !id.startsWith("temp-")) {
           
            const remoteTodo = todoMap.get(String(id));
            if (remoteTodo && remoteTodo._id) {
              
                await removeMutation({ id: remoteTodo._id });
            } else if (remoteTodos !== undefined) {
              
                console.warn(`Todo ID "${id}" not found in remote data, skipping mutation. Available IDs:`, Array.from(todoMap.keys()));
            }
        } else if (typeof id !== "string") {
            await removeMutation({ id });
        }
    } catch (error) {
        console.error("Failed to remove todo", error);
        setTodos(previousTodos);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(previousTodos));
        }
    }
  };

  return { todos, addTodo, toggleTodo, removeTodo };
}
export function TodoList() {
  const { todos, toggleTodo, removeTodo } = useTodoStore();

  return (
    <div className="max-w-md mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-700">Tasks ({todos.length})</h2>
      {todos.length === 0 && <p className="text-gray-400 text-center">No tasks yet.</p>}
      
      <ul className="space-y-3">
        {todos.map((todo) => (
          <li
            key={todo._id}
            className={`p-4 bg-white border rounded-lg shadow-sm flex justify-between items-center transition-all ${
                typeof todo._id === "string" && todo._id.startsWith("temp-") ? "opacity-70" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
                <input 
                    type="checkbox" 
                    checked={todo.isCompleted} 
                    onChange={() => toggleTodo(todo._id, todo.isCompleted)}
                    className="w-5 h-5 cursor-pointer accent-blue-600"
                />
                <span className={`truncate ${todo.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}>
                {todo.text}
                </span>
            </div>
            
            <button 
                onClick={() => removeTodo(todo._id)}
                className="text-red-500 hover:text-red-700 px-2 text-sm font-semibold"
            >
                Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AddTodo() {
  const { addTodo } = useTodoStore();
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTodo(text);
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