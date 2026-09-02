import "@shopify/ui-extensions/preact";
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {i18n, close, data, extension: {target}} = shopify;
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setField = (key, value) => {
    setForm((prev) => ({...prev, [key]: value}));
  };

  // Use direct API calls to fetch data from Shopify.
  // See https://shopify.dev/docs/api/admin-graphql for more information about Shopify's GraphQL API
  useEffect(() => {
    (async function getProductInfo() {
      setLoading(true);
      setError(null);

      // 1. Product Context Detection + 2. Product ID Retrieval
      const productId = data.selected[0].id;

      // 3. Product Information Fetching
      const getProductQuery = {
        query: `query Product($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            vendor
            status
            productType
            metafields(first: 20) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                }
              }
            }
          }
        }`,
        variables: {id: productId},
      };

      const res = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        body: JSON.stringify(getProductQuery),
      });

      if (!res.ok) {
        console.error('Network error');
        setError('Failed to load product details.');
        setLoading(false);
        return;
      }

      const {data: productData, errors} = await res.json();
      if (errors) {
        console.error(errors);
        setError('Failed to load product details.');
        setLoading(false);
        return;
      }

      setProduct(productData.product);
      setForm(productData.product);
      setLoading(false);
    })();
  }, [data.selected]); // 6. Real-time Data: re-fetches whenever the action is opened for a product

  // 7. Product Updates: saves edited fields back to Shopify through a GraphQL mutation
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const productUpdateMutation = {
      query: `mutation ProductUpdate($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product {
            id
            title
            handle
            vendor
            status
            productType
          }
          userErrors {
            field
            message
          }
        }
      }`,
      variables: {
        product: {
          id: product.id,
          title: form.title,
          vendor: form.vendor,
          productType: form.productType,
          status: form.status,
          // 9. Custom Business Logic: stamp an audit-trail metafield every time
          // this extension saves, so edits made here are traceable later.
          metafields: [
            {
              namespace: 'custom',
              key: 'last_updated_via_app',
              type: 'single_line_text_field',
              value: new Date().toISOString(),
            },
          ],
        },
      },
    };

    const res = await fetch("shopify:admin/api/graphql.json", {
      method: "POST",
      body: JSON.stringify(productUpdateMutation),
    });

    if (!res.ok) {
      console.error('Network error');
      setError('Failed to save product.');
      setSaving(false);
      return;
    }

    const {data: mutationData, errors} = await res.json();
    const userErrors = mutationData?.productUpdate?.userErrors;

    if (errors || (userErrors && userErrors.length > 0)) {
      console.error(errors ?? userErrors);
      setError(userErrors?.[0]?.message ?? 'Failed to save product.');
      setSaving(false);
      return;
    }

    setSaving(false);
    close();
  };

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <s-admin-action>
      <s-stack direction="block" gap="base">
        {/* Set the translation values for each supported language in the locales directory */}
        <s-text type="strong">{i18n.translate('welcome', {target})}</s-text>

        {loading && <s-text>Loading product details…</s-text>}

        {error && <s-banner tone="critical">{error}</s-banner>}

        {/* 4. Product Details Display + 7. Product Updates (editable fields) */}
        {!loading && form && (
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Title"
              value={form.title}
              onInput={(e) => setField('title', e.target.value)}
            />
            <s-text-field
              label="Vendor"
              value={form.vendor}
              onInput={(e) => setField('vendor', e.target.value)}
            />
            <s-text-field
              label="Product type"
              value={form.productType}
              onInput={(e) => setField('productType', e.target.value)}
            />
            <s-select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              {PRODUCT_STATUSES.map((status) => (
                <s-option key={status} value={status}>{status}</s-option>
              ))}
            </s-select>
            <s-text><s-text type="strong">Handle:</s-text> {form.handle}</s-text>
            <s-text><s-text type="strong">ID:</s-text> {form.id}</s-text>

            {/* 8. Metafield Management: read-only list of every metafield on the product */}
            <s-text type="strong">Metafields</s-text>
            {form.metafields.edges.length === 0 && <s-text>No metafields on this product.</s-text>}
            {form.metafields.edges.length > 0 && (
              <s-stack direction="block" gap="tight">
                {form.metafields.edges.map(({node}) => (
                  <s-text key={node.id}>
                    <s-text type="strong">{node.namespace}.{node.key}</s-text> ({node.type}): {node.value}
                  </s-text>
                ))}
              </s-stack>
            )}
          </s-stack>
        )}

        {!loading && !form && !error && <s-text>Unable to load product details.</s-text>}
      </s-stack>
      <s-button slot="primary-action" loading={saving} disabled={loading || !form} onClick={handleSave}>
        Done
      </s-button>
      <s-button slot="secondary-actions" onClick={() => close()}>Close</s-button>
    </s-admin-action>
  );
}
