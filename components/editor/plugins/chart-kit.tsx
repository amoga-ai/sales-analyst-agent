'use client';

// Registers the chart block (type "chart") with the editor. It is a void block: its content comes from its title, labels and values.
import { createPlatePlugin } from 'platejs/react';

import { ChartElement } from '@/components/ui/chart-node';

export const ChartKit = [
  createPlatePlugin({
    key: 'chart',
    node: {
      isElement: true,
      isVoid: true,
      component: ChartElement,
    },
  }),
];