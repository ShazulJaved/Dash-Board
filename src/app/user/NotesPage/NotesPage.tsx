import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Types for your note
type Note = {
  id: string;
  text: string;
  completed: boolean;
  pinned: boolean;
  color: string;
  createdAt: string;
};

const COLORS = [
  "bg-yellow-100",
  "bg-blue-100",
  "bg-pink-100",
  "bg-green-100",
  "bg-purple-100",
  "bg-orange-100"
];

function NoteInput({ onAdd }: { onAdd: (note: Omit<Note, "id" | "createdAt">) => void }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [pinned, setPinned] = useState(false);

  const handleAdd = () => {
    if (text.trim()) {
      onAdd({ text: text.trim(), color, completed: false, pinned });
      setText("");
      setColor(COLORS[0]);
      setPinned(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <textarea
        className="border rounded px-3 py-2 w-full resize-none"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write your note..."
        rows={2}
        onKeyDown={e => e.ctrlKey && e.key === "Enter" && handleAdd()}
      />
      <div className="flex items-center gap-2">
        <div>
          <span className="text-xs mr-2">Color:</span>
          <select className="rounded" value={color} onChange={e => setColor(e.target.value)}>
            {COLORS.map(c => (
              <option key={c} value={c}>{c.replace("bg-","").replace("-100","")}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <span className="text-xs">Pin</span>
        </label>
        <button
          className="ml-auto bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
          onClick={handleAdd}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function NoteList({
  notes,
  onDelete,
  onComplete,
  onPin,
  onEdit
}: {
  notes: Note[];
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onPin: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}) {
  const [editing, setEditing] = useState<{ [id: string]: string }>({});

  return (
    <ul className="mt-4 space-y-3">
      <AnimatePresence>
        {notes.map(note => (
          <motion.li
            key={note.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className={`flex flex-col px-4 py-3 rounded shadow ${note.color} ${note.completed ? "opacity-50 line-through" : ""} relative`}
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <button
                  className={`text-xl ${note.pinned ? "text-yellow-500" : "text-gray-400"} hover:text-yellow-500`}
                  title={note.pinned ? "Unpin note" : "Pin note"}
                  onClick={() => onPin(note.id)}
                >
                  📌
                </button>
                <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-1">
                <button
                  className="text-green-500 hover:text-green-600"
                  onClick={() => onComplete(note.id)}
                  title={note.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {note.completed ? "↩️" : "✔️"}
                </button>
                <button
                  className="text-blue-500 hover:text-blue-600"
                  onClick={() => setEditing({ ...editing, [note.id]: note.text })}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => onDelete(note.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
            {editing[note.id] !== undefined ? (
              <div className="mt-2 flex gap-2">
                <textarea
                  className="border rounded px-2 py-1 w-full resize-none"
                  value={editing[note.id]}
                  onChange={e => setEditing({ ...editing, [note.id]: e.target.value })}
                  rows={2}
                />
                <button
                  className="bg-blue-500 text-white px-2 rounded hover:bg-blue-600"
                  onClick={() => {
                    onEdit(note.id, editing[note.id]);
                    setEditing(edit => {
                      const copy = { ...edit }; delete copy[note.id]; return copy;
                    });
                  }}
                  title="Save"
                >💾</button>
                <button
                  className="bg-gray-200 px-2 rounded hover:bg-gray-300"
                  onClick={() => setEditing(edit => {
                    const copy = { ...edit }; delete copy[note.id]; return copy;
                  })}
                  title="Cancel"
                >✖️</button>
              </div>
            ) : (
              <span className="mt-2 whitespace-pre-line">{note.text}</span>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export default function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);

  // Persist notes in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_notes_v2");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_notes_v2", JSON.stringify(notes));
  }, [notes]);

  // Sort: pinned notes first
  const sortedNotes = [...notes].sort((a, b) =>
    a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
  );

  const addNote = (note: Omit<Note, "id" | "createdAt">) => {
    setNotes([
      ...notes,
      {
        ...note,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const deleteNote = (id: string) =>
    setNotes(notes.filter(n => n.id !== id));

  const completeNote = (id: string) =>
    setNotes(notes.map(n =>
      n.id === id ? { ...n, completed: !n.completed } : n
    ));

  const pinNote = (id: string) =>
    setNotes(notes.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned } : n
    ));

  const editNote = (id: string, text: string) =>
    setNotes(notes.map(n =>
      n.id === id ? { ...n, text } : n
    ));

  return (
    <div className="bg-gray-50 p-6 rounded-xl shadow max-w-lg mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-2">Notes & Tasks</h2>
      <NoteInput onAdd={addNote} />
      <NoteList
        notes={sortedNotes}
        onDelete={deleteNote}
        onComplete={completeNote}
        onPin={pinNote}
        onEdit={editNote}
      />
      {notes.length === 0 && (
        <p className="mt-6 text-gray-400 text-center">No notes yet. Add one above!</p>
      )}
    </div>
  );
}