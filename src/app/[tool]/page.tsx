import { notFound } from 'next/navigation';
import { getToolBySlug, tools } from '@/lib/tools-data';
import { getToolMetadata, generateToolSchema } from '@/lib/seo-config';
import ToolPageContent from '@/components/pdf/ToolPageContent';

// Generate static params for all tool routes
export function generateStaticParams() {
  const routes = tools.map((tool) => ({ tool: tool.slug }));
  routes.push({ tool: 'pdf-to-jpg' });
  routes.push({ tool: 'jpg-to-pdf' });
  routes.push({ tool: 'small-pdf' });
  routes.push({ tool: 'small-word' });
  routes.push({ tool: 'docx-to-jpg' });
  routes.push({ tool: 'jpg-to-docx' });
  routes.push({ tool: 'docx-to-png' });
  routes.push({ tool: 'png-to-docx' });
  routes.push({ tool: 'unlock-pdf' });
  routes.push({ tool: 'hapus-protect' });
  routes.push({ tool: 'remove-watermark' });
  routes.push({ tool: 'hapus-watermark' });
  return routes;
}

// Generate metadata for each tool page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  return getToolMetadata(slug);
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const schemas = generateToolSchema(tool);

  // Filter other tools for the "Related Tools" section
  const relatedTools = tools
    .filter((t) => t.id !== tool.id)
    .slice(0, 4);

  return (
    <div className="relative min-h-screen">
      {/* JSON-LD Schema */}
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <ToolPageContent tool={tool} relatedTools={relatedTools} />
    </div>
  );
}
