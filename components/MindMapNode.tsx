
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TreeLayoutNode } from '../types';
import { DEPTH_COLORS, MAX_DEPTH, NODE_WIDTH, NODE_HEIGHT } from '../constants';
import { Sparkles, Loader2, Plus } from 'lucide-react';

interface MindMapNodeProps {
  node: TreeLayoutNode;
  onExpand: (id: string) => void;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ node, onExpand }) => {
  const { data } = node;
  const isMaxDepth = data.depth >= MAX_DEPTH;
  const hasChildren = data.childrenIds.length > 0;
  
  const colorClass = DEPTH_COLORS[Math.min(data.depth, DEPTH_COLORS.length - 1)];

  // Randomize animation slightly so nodes don't float in perfect sync
  const floatDuration = useMemo(() => 3 + Math.random() * 2, []);
  const floatDelay = useMemo(() => Math.random() * 2, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.isLoading || isMaxDepth || hasChildren) return;
    onExpand(data.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
          opacity: 1, 
          scale: 1,
          y: [0, -6, 0] // Floating effect
      }}
      transition={{ 
        opacity: { duration: 0.5 },
        scale: { type: "spring", stiffness: 260, damping: 20 },
        y: { 
            duration: floatDuration, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: floatDelay
        }
      }}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        // Center the node on its coordinates
        marginLeft: -NODE_WIDTH / 2,
        marginTop: -NODE_HEIGHT / 2,
      }}
      className="pointer-events-auto z-10" 
    >
      <div
        onClick={handleClick}
        className={`
          relative w-full h-full rounded-full shadow-lg border-2 border-white/30 backdrop-blur-md
          flex items-center justify-center px-4 py-2 cursor-pointer select-none
          transition-all duration-300 group
          bg-gradient-to-br ${colorClass}
          ${isMaxDepth ? 'opacity-90 grayscale-[0.3]' : 'hover:scale-110 hover:shadow-xl hover:shadow-blue-500/20'}
          ${hasChildren ? 'cursor-default' : ''}
          ${data.isLoading ? 'ring-4 ring-blue-200/50' : ''}
        `}
      >
        <span className="text-white font-semibold text-center text-sm leading-tight drop-shadow-md">
          {data.text}
        </span>

        {/* Action Indicator (only show if expandable) */}
        {!isMaxDepth && !hasChildren && !data.isLoading && (
           <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white text-blue-600 rounded-full p-0.5 shadow-sm">
                <Plus size={12} strokeWidth={3} />
              </div>
           </div>
        )}

        {/* Loading Indicator */}
        {data.isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
             <Loader2 className="w-5 h-5 text-white animate-spin" />
           </div>
        )}
        
        {/* Root Label */}
        {data.depth === 0 && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white/90 text-blue-600 text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm border border-blue-100">
                CORE
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(MindMapNode);
