// Fixed list of preset questions: each one maps to one Woo report tool, with no AI model involved.
export const PRESETS = [
  { id: "pending-orders", label: "Pending orders", tool: "woocommerce__get_orders_report", args: {} },
  { id: "sales", label: "Sales", tool: "woocommerce__get_sales_report", args: {} },
  { id: "products", label: "Products", tool: "woocommerce__get_products_report", args: {} },
];