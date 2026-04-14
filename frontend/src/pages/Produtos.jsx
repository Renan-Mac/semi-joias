import { useEffect, useState, useCallback } from "react";
import {
  getProdutos, createProduto, updateProduto, deleteProduto,
  mediaUrl, fmtCurrency, categorias, categoriaLabel,
} from "../services/api";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

const emptyForm = { categoria_da_peca: "anel", descricao_da_peca: "", quantidade: 0, valor_de_compra: "", valor_de_venda: "", foto_da_peca: null };

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      setProdutos(await getProdutos());
    } catch { setToast({ message: "Erro ao carregar produtos", type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== null && v !== "" && fd.append(k, v));
      await createProduto(fd);
      setForm(emptyForm);
      setToast({ message: "Produto adicionado!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao adicionar produto", type: "error" }); }
  };

  const confirmDelete = async () => {
    try {
      await deleteProduto(deleteTarget);
      setDeleteTarget(null);
      setToast({ message: "Produto excluido!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao excluir. Pode haver vendas vinculadas.", type: "error" }); setDeleteTarget(null); }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEditForm({
      descricao_da_peca: p.descricao_da_peca,
      categoria_da_peca: p.categoria_da_peca,
      quantidade: p.quantidade,
      valor_de_compra: p.valor_de_compra,
      valor_de_venda: p.valor_de_venda,
    });
  };

  const saveEdit = async () => {
    try {
      await updateProduto(editId, editForm);
      setEditId(null);
      setToast({ message: "Produto atualizado!", type: "success" });
      await load();
    } catch { setToast({ message: "Erro ao atualizar produto", type: "error" }); }
  };

  const filtered = produtos.filter((p) => {
    const q = search.toLowerCase();
    return p.descricao_da_peca.toLowerCase().includes(q) || p.categoria_da_peca.toLowerCase().includes(q);
  });

  if (loading) return <Loading />;

  const stockBadge = (qty) => {
    if (qty === 0) return <span className="stock-badge stock-badge--out">Esgotado</span>;
    if (qty <= 2) return <span className="stock-badge stock-badge--low">Estoque baixo: {qty}</span>;
    return <span className="stock-badge stock-badge--ok">Em estoque: {qty}</span>;
  };

  return (
    <>
      <div className="page-header">
        <h2>Produtos</h2>
        <p>Gerencie o estoque de semijoias</p>
      </div>

      <div className="card card--form">
        <div className="card__title">Novo Produto</div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Categoria</label>
              <select className="form-select" value={form.categoria_da_peca} onChange={(e) => setForm({ ...form, categoria_da_peca: e.target.value })}>
                {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Descricao</label>
              <input className="form-input" placeholder="Descricao da peca" value={form.descricao_da_peca} onChange={(e) => setForm({ ...form, descricao_da_peca: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input className="form-input" type="number" min="0" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Valor de compra (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_de_compra} onChange={(e) => setForm({ ...form, valor_de_compra: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Valor de venda (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_de_venda} onChange={(e) => setForm({ ...form, valor_de_venda: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Foto</label>
              <input className="form-input" type="file" accept="image/*" onChange={(e) => setForm({ ...form, foto_da_peca: e.target.files?.[0] || null })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">Adicionar Produto</button>
          </div>
        </form>
      </div>

      <div className="search-bar">
        <span className="search-bar__icon">&#128269;</span>
        <input className="search-bar__input" placeholder="Buscar por descricao ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="&#128142;" title="Nenhum produto encontrado" subtitle={search ? "Tente outra busca" : "Adicione seu primeiro produto acima"} />
      ) : (
        <div className="data-grid">
          {filtered.map((p) => (
            <div className="data-card" key={p.id}>
              {editId === p.id ? (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Descricao</label>
                      <input className="form-input" value={editForm.descricao_da_peca} onChange={(e) => setEditForm({ ...editForm, descricao_da_peca: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Categoria</label>
                      <select className="form-select" value={editForm.categoria_da_peca} onChange={(e) => setEditForm({ ...editForm, categoria_da_peca: e.target.value })}>
                        {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantidade</label>
                      <input className="form-input" type="number" min="0" value={editForm.quantidade} onChange={(e) => setEditForm({ ...editForm, quantidade: Number(e.target.value) })} />
                    </div>
                    <div className="form-group">
                      <label>Compra (R$)</label>
                      <input className="form-input" type="number" step="0.01" value={editForm.valor_de_compra} onChange={(e) => setEditForm({ ...editForm, valor_de_compra: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Venda (R$)</label>
                      <input className="form-input" type="number" step="0.01" value={editForm.valor_de_venda} onChange={(e) => setEditForm({ ...editForm, valor_de_venda: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--primary btn--small" onClick={saveEdit}>Salvar</button>
                    <button className="btn btn--ghost btn--small" onClick={() => setEditId(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <div className="product-card">
                  {p.foto_da_peca ? (
                    <img className="product-card__img" src={mediaUrl(p.foto_da_peca)} alt={p.descricao_da_peca} />
                  ) : (
                    <div className="product-card__placeholder">&#9830;</div>
                  )}
                  <div className="product-card__body">
                    <div className="data-card__header">
                      <span className="data-card__title">{p.descricao_da_peca}</span>
                      <span className="data-card__badge">{categoriaLabel(p.categoria_da_peca)}</span>
                    </div>
                    <div className="data-card__details">
                      <span className="data-card__detail">Compra: <strong>{fmtCurrency(p.valor_de_compra)}</strong></span>
                      <span className="data-card__detail">Venda: <strong>{fmtCurrency(p.valor_de_venda)}</strong></span>
                      <span className="data-card__detail">{stockBadge(p.quantidade)}</span>
                    </div>
                    <div className="data-card__actions">
                      <button className="btn btn--ghost btn--small" onClick={() => startEdit(p)}>Editar</button>
                      <button className="btn btn--danger btn--small" onClick={() => setDeleteTarget(p.id)}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir produto"
          message="Tem certeza que deseja excluir este produto? Esta acao nao pode ser desfeita."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
