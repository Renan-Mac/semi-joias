import { useEffect, useState, useCallback } from "react";
import { getClientes, createCliente, updateCliente, deleteCliente, fmtDate } from "../services/api";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

const emptyForm = { nome: "", telefone: "", email: "", data_de_aniversario: "" };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try { setClientes(await getClientes()); }
    catch { setToast({ message: "Erro ao carregar clientes", type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCliente(form);
      setForm(emptyForm);
      setToast({ message: "Cliente adicionado!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao adicionar cliente", type: "error" }); }
  };

  const confirmDelete = async () => {
    try {
      await deleteCliente(deleteTarget);
      setDeleteTarget(null);
      setToast({ message: "Cliente excluido!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao excluir. Pode haver vendas vinculadas.", type: "error" }); setDeleteTarget(null); }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditForm({ nome: c.nome, telefone: c.telefone || "", email: c.email || "", data_de_aniversario: c.data_de_aniversario || "" });
  };

  const saveEdit = async () => {
    try {
      await updateCliente(editId, editForm);
      setEditId(null);
      setToast({ message: "Cliente atualizado!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao atualizar cliente", type: "error" }); }
  };

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return c.nome.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.telefone || "").includes(q);
  });

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-header">
        <h2>Clientes</h2>
        <p>Cadastro e gerenciamento de clientes</p>
      </div>

      <div className="card card--form">
        <div className="card__title">Novo Cliente</div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome</label>
              <input className="form-input" placeholder="Nome do cliente" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input className="form-input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input className="form-input" placeholder="(DDD) 99999-9999" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Aniversario</label>
              <input className="form-input" type="date" value={form.data_de_aniversario} onChange={(e) => setForm({ ...form, data_de_aniversario: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">Adicionar Cliente</button>
          </div>
        </form>
      </div>

      <div className="search-bar">
        <span className="search-bar__icon">&#128269;</span>
        <input className="search-bar__input" placeholder="Buscar por nome, e-mail ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="&#128100;" title="Nenhum cliente encontrado" subtitle={search ? "Tente outra busca" : "Adicione seu primeiro cliente acima"} />
      ) : (
        <div className="data-grid">
          {filtered.map((c) => (
            <div className="data-card" key={c.id}>
              {editId === c.id ? (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nome</label>
                      <input className="form-input" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>E-mail</label>
                      <input className="form-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Telefone</label>
                      <input className="form-input" value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Aniversario</label>
                      <input className="form-input" type="date" value={editForm.data_de_aniversario} onChange={(e) => setEditForm({ ...editForm, data_de_aniversario: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--primary btn--small" onClick={saveEdit}>Salvar</button>
                    <button className="btn btn--ghost btn--small" onClick={() => setEditId(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="data-card__header">
                    <span className="data-card__title">{c.nome}</span>
                  </div>
                  <div className="data-card__details">
                    <span className="data-card__detail">&#128222; <strong>{c.telefone || "-"}</strong></span>
                    <span className="data-card__detail">&#9993; <strong>{c.email || "-"}</strong></span>
                    <span className="data-card__detail">&#127874; <strong>{fmtDate(c.data_de_aniversario)}</strong></span>
                  </div>
                  <div className="data-card__actions">
                    <button className="btn btn--ghost btn--small" onClick={() => startEdit(c)}>Editar</button>
                    <button className="btn btn--danger btn--small" onClick={() => setDeleteTarget(c.id)}>Excluir</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir cliente"
          message="Tem certeza que deseja excluir este cliente? Esta acao nao pode ser desfeita."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
