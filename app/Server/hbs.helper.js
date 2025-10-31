export const hbsHelpers = {
    eq: (a,b) => String(a) === String(b),
    range: (start, end) => Array.from({ length: end - start + 1}, (_, i) => i + start),
    multiply: (a, b) => Number(a) * Number(b),
    cartTotal: (items) => items.reduce((sum, item) => sum + (item.product.price * item.qty), 0),
    formatMoney: (n) => {
        try { return new Init1.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximunFractionDigits: 0})}
        catch { return n; }
    },
    formatDate: (d) => {
        try { return new Date(d).toLocaleString("es-AR"); }
        catch { return d; }
    }
};