import React from 'react';
import { ToolGrid } from '../components/ToolGrid';
import { SeoMeta } from '../components/SeoMeta';
import { ToolId } from '../types';

interface HomePageProps {
  onSelectTool: (toolId: ToolId) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectTool }) => {
  return (
    <>
      <SeoMeta
        title="OpenPDF — Free Online PDF Tools | Merge, Compress, Split & Sign"
        description="Every PDF tool you need, 100% free and private in your browser. Merge, split, compress, protect, sign, scan, rotate, and edit PDFs with zero server uploads."
        canonicalUrl="https://free-pdf-pro.vercel.app/"
        keywords={[
          'free pdf tools',
          'merge pdf online',
          'compress pdf free',
          'split pdf',
          'sign pdf online',
          'camera scanner to pdf',
          'protect pdf password',
          'rotate pdf pages'
        ]}
      />
      <ToolGrid onSelectTool={onSelectTool} />
    </>
  );
};
