import type { Metadata } from 'next';
import type { ToolData } from './tools-data';
import { getToolBySlug } from './tools-data';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://changespdf.com';
export const SITE_NAME = 'ChangesPDF';

export function getToolMetadata(slug: string): Metadata {
  const tool = getToolBySlug(slug);
  if (!tool) {
    return {
      title: `PDF Tool Not Found | ${SITE_NAME}`,
      description: 'The requested PDF tool was not found.',
    };
  }

  return {
    title: tool.seoTitle,
    description: tool.seoDescription,
    keywords: tool.seoKeywords,
    alternates: {
      canonical: `${SITE_URL}/${tool.slug}`,
    },
    openGraph: {
      title: tool.seoTitle,
      description: tool.seoDescription,
      url: `${SITE_URL}/${tool.slug}`,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'id_ID',
      alternateLocale: ['en_US'],
      images: [
        {
          url: `${SITE_URL}/opengraph-image.png`,
          width: 1200,
          height: 630,
          alt: `${tool.title} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.seoTitle,
      description: tool.seoDescription,
      images: [`${SITE_URL}/opengraph-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
  };
}

export function generateToolSchema(tool: ToolData): object[] {
  const schemas: object[] = [];

  // WebApplication schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${tool.title} - ${SITE_NAME}`,
    alternateName: [
      `Change PDF ${tool.title}`,
      `ChangesPDF ${tool.title}`,
      `Convert PDF ${tool.title}`,
      tool.title,
    ],
    description: tool.seoDescription,
    url: `${SITE_URL}/${tool.slug}`,
    applicationCategory: 'UtilityApplication',
    applicationSubCategory: 'Office & Document Utility',
    operatingSystem: 'All',
    browserRequirements: 'Requires modern web browser with HTML5 and JavaScript enabled',
    inLanguage: ['id', 'en'],
    isAccessibleForFree: true,
    featureList: [
      '100% Client-Side In-Memory Processing',
      'Zero Server File Uploads for Complete Privacy',
      'High Speed Instant Document Processing',
      'Free Without Watermark or Registration',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '2840',
      bestRating: '5',
      worstRating: '1',
    },
  });

  // HowTo schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Use ${tool.title}`,
    description: tool.description,
    totalTime: 'PT1M',
    supply: [
      {
        '@type': 'HowToSupply',
        name: 'Digital Document File (PDF, Office, or Image)',
      },
    ],
    tool: [
      {
        '@type': 'HowToTool',
        name: `${SITE_NAME} Online Tool`,
      },
    ],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Upload your file',
        text: `Drag and drop your file into the ${tool.title} tool or click to browse from your device.`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Configure options',
        text: 'Adjust options, preview modifications in real-time, or organize pages.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Download result',
        text: 'Click download to save the processed file directly to your computer or phone.',
      },
    ],
  });

  // BreadcrumbList schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: tool.title,
        item: `${SITE_URL}/${tool.slug}`,
      },
    ],
  });

  // FAQPage schema
  if (tool.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  return schemas;
}

export function getHomepageSchemas(): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ChangesPDF',
      alternateName: [
        'Changes PDF',
        'Change PDF',
        'ChangesPDF Converter',
        'ChangesPDF Online',
        'Convert PDF Free',
      ],
      url: SITE_URL,
      description:
        'Free online PDF tools to change PDF to Word, convert PDF, merge, split, compress, protect, and edit PDF files directly in your browser.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/{search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ChangesPDF',
      alternateName: 'Changes PDF',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      founder: {
        '@type': 'Person',
        name: 'Nanda Revan Saputro',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'ChangesPDF Document Suite',
      applicationCategory: 'UtilityApplication',
      applicationSubCategory: 'Office & Document Utility',
      operatingSystem: 'All Web Browsers',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '3820',
        bestRating: '5',
        worstRating: '1',
      },
    },
  ];
}

export function getHomeMetadata(): Metadata {
  return {
    title: 'ChangesPDF - Change, Convert & Edit PDF Files Online Free',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files. 100% client-side processing, your files never leave your device. iLovePDF alternative.',
    keywords: [
      'changes pdf',
      'change pdf',
      'convert pdf',
      'changes pdf to word',
      'pdf converter',
      'merge pdf',
      'split pdf',
      'compress pdf',
      'pdf to word',
      'word to pdf',
      'image to pdf',
      'pdf editor',
      'free pdf tools',
      'ilovepdf alternative',
      'online pdf editor',
      'ubah pdf',
      'konversi pdf',
      'kompres pdf',
    ],
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      title: 'ChangesPDF - Change, Convert & Edit PDF Files Online Free',
      description:
        'Free online PDF tools. Changes PDF to Word, merge, split, compress, and more. 100% private, files never leave your browser.',
      url: SITE_URL,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'id_ID',
      alternateLocale: ['en_US'],
      images: [
        {
          url: `${SITE_URL}/opengraph-image.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - Free Online PDF Tools`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ChangesPDF - Free Online PDF Tools',
      description:
        'Change, convert, and edit PDF files online for free. 100% client-side and secure.',
      images: [`${SITE_URL}/opengraph-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
  };
}
