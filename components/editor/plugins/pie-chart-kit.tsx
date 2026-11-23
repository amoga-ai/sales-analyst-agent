'use client';

// Registers the pie chart block (type "pie_chart") with the editor. It is a void block: its content comes from its labels and values.
import { createPlatePlugin } from 'platejs/react';

import { PieChartElement } from '@/components/ui/pie-chart-node';

export const PieChartKit = [
  createPlatePlugin({
    key: 'pie_chart',
    node: {
      isElement: true,
      isVoid: true,
      component: PieChartElement,
    },
  }),
];