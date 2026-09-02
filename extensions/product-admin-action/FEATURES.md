# Product Admin Action — Feature List

1. **Product Context Detection** — Automatically identifies the product currently opened in Shopify Admin.
2. **Product ID Retrieval** — Retrieves the Shopify Product GID from the selected product context.
3. **Product Information Fetching** — Uses Admin GraphQL API to retrieve product details.
4. **Product Details Display** — Displays information such as:

   * Product title
   * Product ID
   * Handle
   * Vendor
   * Product status
   * Product type
5. **Admin Action Integration** — Available directly from the product page's **More actions** menu.
6. **Real-time Data** — Fetches the latest product information when the action is opened.
7. **Product Updates** — Can be extended to update product data through GraphQL mutations.
8. **Metafield Management** — Can be extended to read and update product metafields.
9. **Custom Business Logic** — Can connect the product action to custom workflows or APIs.
10. **Shopify-Native UI** — Uses Shopify's Admin UI Extension components and follows Shopify Admin's interface patterns.
