import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProdutos,
  getClientes,
  getVendas,
  getDashboardAnalytics,
  fmtCurrency,
  categoriaLabel,
} from "../services/api";
import Loading from "../components/Loading";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function StatChartBars({ rows, valueKey, labelKey }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);

  if (!rows.length) {
    return <p className="chart-empty">Sem dados no periodo.</p>;
  }

  return (
    <div className="chart-bars">
      {rows.map((r) => {
        const value = Number(r[valueKey] || 0);
        const width = Math.max((value / max) * 100, value > 0 ? 6 : 0);
        return (
          <div className="chart-bars__row" key={`${r[labelKey]}-${value}`}>
            <div className="chart-bars__label">{r[labelKey]}</div>
            <div className="chart-bars__track">
              <div className="chart-bars__fill" style={{ width: `${width}%` }} />
            </div>
            <div className="chart-bars__value">{fmtCurrency(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

function RevenueLine({ series }) {
  if (!series.length) {
    return <p className="chart-empty">Sem dados no periodo.</p>;
  }

  const max = Math.max(...series.map((item) => Number(item.faturamento || 0)), 1);
  const w = 680;
  const h = 220;
  const p = 18;
  const innerW = w - p * 2;
  const innerH = h - p * 2;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;

  const points = series
    .map((item, i) => {
      const value = Number(item.faturamento || 0);
      const x = p + i * stepX;
      const y = p + innerH - (value / max) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${p},${h - p} ${points} ${p + innerW},${h - p}`;
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="Faturamento por dia">
        <polygon points={area} className="line-chart__area" />
        <polyline points={points} className="line-chart__line" />
      </svg>
      <div className="line-chart__labels">
        <span>{prettyDate(first.dia)}</span>
        <span>{prettyDate(last.dia)}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    Promise.all([
      getProdutos(),
      getClientes(),
      getVendas(),
      getDashboardAnalytics({ start: isoDate(start), end: isoDate(end) }),
    ])
      .then(([p, c, v, a]) => {
        setProdutos(p);
        setClientes(c);
        setVendas(v);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const kpis = analytics?.kpis || {};

  const shareRows = useMemo(() => {
    const total = Number(kpis.faturamento || 0);
    const rows = analytics?.categoria_share || [];
    return rows.map((row) => {
      const amount = Number(row.faturamento || 0);
      const percent = total > 0 ? (amount / total) * 100 : 0;
      return {
        categoria: categoriaLabel(row.categoria_da_peca),
        faturamento: amount,
        percent: percent.toFixed(1),
      };
    });
  }, [analytics, kpis.faturamento]);

  if (loading) return <Loading />;

  const totalEstoque = produtos.reduce((s, p) => s + p.quantidade, 0);
  const lowStock = produtos.filter((p) => p.quantidade <= 2 && p.quantidade > 0);
  const outOfStock = produtos.filter((p) => p.quantidade === 0);

  return (
    <>
      <div className="dashboard-hero">
        <h2>Vane Semijoias</h2>
        <p>Painel de controle de estoque e vendas</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--rose">&#9830;</div>
          <div className="stat-card__info">
            <h3>{produtos.length}</h3>
            <span>Produtos cadastrados</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">$</div>
          <div className="stat-card__info">
            <h3>{vendas.length}</h3>
            <span>Vendas realizadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--gold">&#9733;</div>
          <div className="stat-card__info">
            <h3>{clientes.length}</h3>
            <span>Clientes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">&#9998;</div>
          <div className="stat-card__info">
            <h3>{totalEstoque}</h3>
            <span>Itens em estoque</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="analytics-toolbar">
          <div className="card__title" style={{ marginBottom: 0 }}>Analise de desempenho</div>
          <div className="analytics-toolbar__actions">
            <button className={`btn btn--small ${days === 7 ? "btn--primary" : "btn--ghost"}`} onClick={() => setDays(7)}>7 dias</button>
            <button className={`btn btn--small ${days === 30 ? "btn--primary" : "btn--ghost"}`} onClick={() => setDays(30)}>30 dias</button>
            <button className={`btn btn--small ${days === 90 ? "btn--primary" : "btn--ghost"}`} onClick={() => setDays(90)}>90 dias</button>
          </div>
        </div>

        <div className="stats-grid" style={{ marginTop: 16, marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--green">$</div>
            <div className="stat-card__info">
              <h3>{fmtCurrency(kpis.faturamento || 0)}</h3>
              <span>Faturamento no periodo</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--amber">&#9650;</div>
            <div className="stat-card__info">
              <h3>{fmtCurrency(kpis.lucro || 0)}</h3>
              <span>Lucro estimado</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--gold">&#9733;</div>
            <div className="stat-card__info">
              <h3>{fmtCurrency(kpis.ticket_medio || 0)}</h3>
              <span>Ticket medio</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--rose">&#128176;</div>
            <div className="stat-card__info">
              <h3>{kpis.vendas || 0}</h3>
              <span>Vendas no periodo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card">
          <div className="card__title">Faturamento por dia</div>
          <RevenueLine series={analytics?.faturamento_series || []} />
        </div>
        <div className="card">
          <div className="card__title">Top 5 produtos por faturamento</div>
          <StatChartBars
            rows={(analytics?.top_produtos || []).map((row) => ({
              nome: row.descricao_da_peca,
              valor: Number(row.faturamento || 0),
            }))}
            labelKey="nome"
            valueKey="valor"
          />
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card">
          <div className="card__title">Participacao por categoria</div>
          <div className="share-list">
            {shareRows.length === 0 && <p className="chart-empty">Sem dados no periodo.</p>}
            {shareRows.map((row) => (
              <div className="share-item" key={row.categoria}>
                <div className="share-item__head">
                  <span>{row.categoria}</span>
                  <span>{row.percent}%</span>
                </div>
                <div className="share-item__track">
                  <div className="share-item__fill" style={{ width: `${row.percent}%` }} />
                </div>
                <div className="share-item__value">{fmtCurrency(row.faturamento)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__title">Top clientes do periodo</div>
          <div className="customer-list">
            {(analytics?.top_clientes || []).length === 0 && <p className="chart-empty">Sem dados no periodo.</p>}
            {(analytics?.top_clientes || []).map((row) => (
              <div className="customer-item" key={row.cliente__nome}>
                <div>
                  <strong>{row.cliente__nome}</strong>
                  <p>{row.compras} compras • {row.itens} itens</p>
                </div>
                <span>{fmtCurrency(row.faturamento)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card__title">Alertas de estoque</div>
          <div className="alert-list">
            {outOfStock.map((p) => (
              <div className="alert-item" key={p.id} style={{ background: "var(--red-50)", borderColor: "#fca5a5" }}>
                <div>
                  <strong>{p.descricao_da_peca}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--gray-500)" }}>{categoriaLabel(p.categoria_da_peca)}</span>
                </div>
                <span className="stock-badge stock-badge--out">Esgotado</span>
              </div>
            ))}
            {lowStock.map((p) => (
              <div className="alert-item" key={p.id}>
                <div>
                  <strong>{p.descricao_da_peca}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--gray-500)" }}>{categoriaLabel(p.categoria_da_peca)}</span>
                </div>
                <span className="stock-badge stock-badge--low">Qtd: {p.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <Link to="/produtos" className="card" style={{ textDecoration: "none", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#128142;</div>
          <div className="card__title" style={{ marginBottom: 0 }}>Produtos</div>
          <p style={{ fontSize: 13, color: "var(--text-light)" }}>Gerenciar estoque</p>
        </Link>
        <Link to="/vendas" className="card" style={{ textDecoration: "none", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#128176;</div>
          <div className="card__title" style={{ marginBottom: 0 }}>Vendas</div>
          <p style={{ fontSize: 13, color: "var(--text-light)" }}>Registrar vendas</p>
        </Link>
        <Link to="/clientes" className="card" style={{ textDecoration: "none", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#128100;</div>
          <div className="card__title" style={{ marginBottom: 0 }}>Clientes</div>
          <p style={{ fontSize: 13, color: "var(--text-light)" }}>Cadastro de clientes</p>
        </Link>
      </div>
    </>
  );
}
