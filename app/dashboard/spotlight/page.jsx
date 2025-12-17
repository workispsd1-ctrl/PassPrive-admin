"use client";

import { useState } from "react";
import SpotlightList from "./ SpotlightList";
import SpotlightForm from "./SpotlightForm";

export default function SpotlightAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Spotlight Manager</h1>

      {!showForm ? (
        <>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            style={styles.addBtn}
          >
            + Add Spotlight
          </button>

          <SpotlightList
            onEdit={(item) => {
              setEditingItem(item);
              setShowForm(true);
            }}
          />
        </>
      ) : (
        <SpotlightForm
          editingItem={editingItem}
          onCancel={() => setShowForm(false)}
          onDone={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

const styles = {
  addBtn: {
    marginTop: 20,
    background: "#DA3224",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    fontSize: 16,
    borderRadius: 8,
    cursor: "pointer",
  },
};
