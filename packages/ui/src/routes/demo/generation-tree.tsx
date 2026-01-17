/**
 * Generation Tree Demo Route
 * 
 * Interactive demo of the D3.js generation tree visualization.
 */

import { createFileRoute } from '@tanstack/react-router';
import { GenerationTreeDemo } from '@/components/generation-tree/demo';

export const Route = createFileRoute('/demo/generation-tree')({
  component: GenerationTreeDemoPage,
});

function GenerationTreeDemoPage() {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <GenerationTreeDemo />
    </div>
  );
}
