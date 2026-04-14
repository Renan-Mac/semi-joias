import { useEffect, useState, useCallback } from "react";
import {
  getVendas, getClientes, getProdutos,
  createVenda, updateVenda, deleteVenda,
  fmtCurrency, fmtDateTime, categoriaLabel,
} from "../services/api";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

const emptyForm = { cliente_id: "", produto_id: "", quantidade: 1, valor_de_venda_praticado: "" };

export default function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [v, c, p] = await Promise.all([getVendas(), getClientes(), getProdutos()]);
      setVendas(v); setClientes(c); setProdutos(p);
    } catch { setToast({ message: "Erro ao carregar vendas", type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        produto_id: Number(form.produto_id),
        quantidade: Number(form.quantidade),
      };
      if (String(form.valor_de_venda_praticado).trim()) {
        payload.valor_de_venda_praticado = form.valor_de_venda_praticado;
      }
      await createVenda(payload);
      setForm(emptyForm);
      setToast({ message: "Venda registrada!", type: "success" });
      await load();
    } catch (err) {
      const msg = err.response?.data?.quantidade?.[0] || err.response?.data?.detail || "Erro ao registrar venda";
      setToast({ message: msg, type: "error" });
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteVenda(deleteTarget);
      setDeleteTarget(null);
      setToast({ message: "Venda excluida!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao excluir venda", type: "error" }); setDeleteTarget(null); }
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditForm({ quantidade: v.quantidade, valor_de_venda_praticado: v.valor_de_venda_praticado });
  };

  const saveEdit = async () => {
    try {
      await updateVenda(editId, {
        quantidade: Number(editForm.quantidade),
        valor_de_venda_praticado: editForm.valor_de_venda_praticado,
      });
      setEditId(null);
      setToast({ message: "Venda atualizada!", type: "success" });
      await load();
    } catch (err) {
      const msg = err.response?.data?.quantidade?.[0] || "Erro ao atualizar venda";
      setToast({ message: msg, type: "error" });
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-header">
        <h2>Vendas</h2>
        <p>Registre e acompanhe todas as vendas</p>
      </div>

      <div className="card card--form">
        <div className="card__title">Registrar Venda</div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Cliente</label>
              <select className="form-select" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Produto</label>
              <select className="form-select" value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })} required>
                <option value="">Selecione um produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantidade === 0}>
                    {p.descricao_da_peca} (Estoque: {p.quantidade}) - {fmtCurrency(p.valor_de_venda)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input className="form-input" type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Preco de venda (opcional)</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="Usar preco do produto" value={form.valor_de_venda_praticado} onChange={(e) => setForm({ ...form, valor_de_venda_praticado: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={!form.cliente_id || !form.produto_id}>Registrar Venda</button>
          </div>
        </form>
      </div>

      {vendas.length === 0 ? (
        <EmptyState icon="&#128176;" title="Nenhuma venda registrada" subtitle="Registre a primeira venda acima" />
      ) : (
        <div className="data-grid">
          {vendas.map((v) => (
            <div className="data-card" key={v.id}>
              {editId === v.id ? (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Quantidade</label>
                      <input className="form-input" type="number" min="1" value={editForm.quantidade} onChange={(e) => setEditForm({ ...editForm, quantidade: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Preco praticado (R$)</label>
                      <input className="form-input" type="number" step="0.01" value={editForm.valor_de_venda_praticado} onChange={(e) => setEditForm({ ...editForm, valor_de_venda_praticado: e.target.value })} />
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
                    <span className="data-card__title">{v.descricao_da_peca}</span>
                    <span className="data-card__badge">{categoriaLabel(v.categoria_da_peca)}</span>
                  </div>
                  <div className="data-card__details">
                    <span className="data-card__detail">&#128100; <strong>{v.cliente_nome}</strong></span>
                    <span className="data-card__detail">Qtd: <strong>{v.quantidade}</strong></span>
                    <span className="data-card__detail">Preco: <strong>{fmtCurrency(v.valor_de_venda_praticado)}</strong></span>
                    <span className="data-card__detail">&#128197; <strong>{fmtDateTime(v.data_de_registro)}</strong></span>
                  </div>
                  <div className="data-card__actions">
                    <button className="btn btn--ghost btn--small" onClick={() => startEdit(v)}>Editar</button>
                    <button className="btn btn--danger btn--small" onClick={() => setDeleteTarget(v.id)}>Excluir</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir venda"
          message="Tem certeza que deseja excluir esta venda? O estoque nao sera restaurado automaticamente."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
