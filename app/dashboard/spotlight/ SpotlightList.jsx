"use client";

import { useEffect, useState } from "react";

export default function SpotlightList({ onEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/spotlight");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete spotlight item?")) return;

    await fetch(`/api/spotlight/${id}`, { method: "DELETE" });
    fetchItems();
  };

  if (showSort) {
    return (
      <SortableList
        items={items}
        onClose={() => setShowSort(false)}
        onUpdated={fetchItems}
      />
    );
  }

  return (
    <div style={{ marginTop: 30 }}>
      <button onClick={() => setShowSort(true)} style={styles.sortBtn}>
        Reorder Items
      </button>

      {loading && <p>Loading...</p>}

      {!loading &&
        items.map((item) => (
          <div key={item.id} style={styles.card}>
            <img
              src={item.thumbnail_url || item.media_url}
              width={120}
              height={90}
              style={{ borderRadius: 8, objectFit: "cover" }}
            />

            <div style={{ marginLeft: 15 }}>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
              <p style={{ opacity: 0.7 }}>Module: {item.module_type}</p>
            </div>

            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => onEdit(item)}
                style={styles.editBtn}
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                style={styles.delBtn}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    alignItems: "center",
    background: "#1A1A1A",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #333",
  },
  editBtn: {
    background: "#3F6DF2",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 6,
  },
  delBtn: {
    background: "#DA3224",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },
  sortBtn: {
    background: "#444",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #666",
  },
};
