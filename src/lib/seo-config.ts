import type { Metadata } from 'next';
import type { ToolData } from './tools-data';
import { getToolBySlug } from './tools-data';

const SITE_URL = 'https://changepdf.com';
const SITE_NAME = 'ChangePDF';

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
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.seoTitle,
      description: tool.seoDescription,
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
    name: `${tool.title} – ${SITE_NAME}`,
    description: tool.seoDescription,
    url: `${SITE_URL}/${tool.slug}`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '2450',
    },
  });

  // HowTo schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to ${tool.title}`,
    description: tool.description,
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Upload your file',
        text: `Drag and drop your file into the ${tool.title} tool or click to browse.`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Configure options',
        text: `Adjust settings and preview your changes before processing.`,
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Download result',
        text: 'Click the download button to save your processed file directly to your device.',
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

export function getHomeMetadata(): Metadata {
  return {
    title: 'ChangePDF – Change, Convert & Edit PDF Files Online for Free',
    description:
      'Free online PDF tools to change PDF to Word, merge, split, compress, protect, and convert PDF files. 100% client-side processing – your files never leave your device. iLovePDF alternative.',
    keywords: [
      'change pdf',
      'change pdf to word',
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
    ],
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      title: 'ChangePDF – Change, Convert & Edit PDF Files Online for Free',
      description:
        'Free online PDF tools. Change PDF to Word, merge, split, compress, and more. 100% private – files never leave your browser.',
      url: SITE_URL,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ChangePDF – Free Online PDF Tools',
      description:
        'Change, convert, and edit PDF files online for free. 100% client-side and secure.',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
