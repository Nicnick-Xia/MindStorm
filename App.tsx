
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RotateCcw, Move, Sparkles } from 'lucide-react';
import * as d3 from 'd3';

import { NodeData } from './types';
import { generateSubIdeas } from './services/geminiService';
import { calculateTreeLayout } from './utils/layout';
import MindMapNode from './components/MindMapNode';
import { COLORS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<Record<string, NodeData>>({});
  const [rootId, setRootId] = useState<string | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Focus management for centering
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Viewport State (Pan/Zoom)
  // Initial transform centers 0,0 at screen center usually
  const [transform, setTransform] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null); // To control zoom instance

  // --- Actions ---

  const centerOnNode = useCallback((nodeId: string, currentLayoutNodes: any[]) => {
    const node = currentLayoutNodes.find(n => n.id === nodeId);
    if (!node || !wrapperRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = 1; // Keep scale at 1 or adapt if needed

    // Target translation to put node at center
    // The node coordinates (node.x, node.y) are relative to the container's origin.
    // We want (node.x * scale) + translateX = width / 2
    // So translateX = width / 2 - node.x * scale
    const targetX = width / 2 - node.x * scale;
    const targetY = height / 2 - node.y * scale;

    const selection = d3.select(wrapperRef.current);
    
    // Use a transition for smooth movement
    selection.transition()
      .duration(1200) // Slow, smooth duration
      .ease(d3.easeCubicOut) // Smooth easing
      .call(
         // We need to trigger the zoom behavior's transform
         // Note: We need the actual zoom instance behavior attached to the element
         // This is a bit tricky in React+D3. We usually attach the behavior in useEffect.
         // We can trigger the event by updating the selection's transform directly via zoom.transform
         // but we need the zoom behavior instance.
         (transition: any) => {
            // We access the stored zoom behavior if possible, or re-select
            // The cleanest way is to re-apply the zoom transform to the selection
            // which will trigger the 'zoom' event listener we set up.
             
             // We need to reference the same zoom behavior instance used in useEffect
             // For simplicity, we will store it in a ref or re-create (if it's stateless enough, but it's not).
             // See useEffect below where we attach zoom.
         }
      );
      
      // Alternative: Just update state manually if we weren't using d3.zoom for interaction.
      // But we are. So we must use d3.zoomIdentity.
  }, []);


  const handleStartBrainstorm = useCallback(async () => {
    if (!inputQuery.trim()) return;
    setIsGenerating(true);

    const newRootId = uuidv4();
    const newRoot: NodeData = {
      id: newRootId,
      text: inputQuery,
      parentId: null,
      depth: 0,
      isExpanded: false,
      isLoading: true,
      childrenIds: []
    };

    setNodes({ [newRootId]: newRoot });
    setRootId(newRootId);
    setFocusedNodeId(newRootId);

    try {
      const ideas = await generateSubIdeas(inputQuery, []);
      
      setNodes(prev => {
        const updatedRoot = { ...prev[newRootId], isExpanded: true, isLoading: false };
        const newNodes: Record<string, NodeData> = { ...prev, [newRootId]: updatedRoot };
        
        const childIds: string[] = [];
        ideas.forEach(idea => {
          const childId = uuidv4();
          childIds.push(childId);
          newNodes[childId] = {
            id: childId,
            text: idea,
            parentId: newRootId,
            depth: 1,
            isExpanded: false,
            isLoading: false,
            childrenIds: []
          };
        });
        newNodes[newRootId].childrenIds = childIds;
        return newNodes;
      });
    } catch (e) {
       console.error(e);
       setNodes(prev => ({
           ...prev,
           [newRootId]: { ...prev[newRootId], isLoading: false }
       }));
    } finally {
      setIsGenerating(false);
      setInputQuery('');
    }
  }, [inputQuery]);

  const handleExpandNode = useCallback(async (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node || node.isLoading || node.childrenIds.length > 0) return;

    // 1. Focus on the clicked node immediately
    setFocusedNodeId(nodeId);

    setNodes(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], isLoading: true }
    }));

    try {
      const path: string[] = [];
      let curr: NodeData | undefined = node;
      while(curr && curr.parentId) {
          if (nodes[curr.parentId]) {
              path.unshift(nodes[curr.parentId].text);
          }
          curr = nodes[curr.parentId || ''];
      }

      const ideas = await generateSubIdeas(node.text, path);

      setNodes(prev => {
        const updatedParent = { ...prev[nodeId], isExpanded: true, isLoading: false };
        const newNodes = { ...prev, [nodeId]: updatedParent };
        
        const childIds: string[] = [];
        ideas.forEach(idea => {
          const childId = uuidv4();
          childIds.push(childId);
          newNodes[childId] = {
            id: childId,
            text: idea,
            parentId: nodeId,
            depth: node.depth + 1,
            isExpanded: false,
            isLoading: false,
            childrenIds: []
          };
        });
        newNodes[nodeId].childrenIds = childIds;
        return newNodes;
      });

    } catch (e) {
        console.error(e);
        setNodes(prev => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], isLoading: false }
        }));
    }
  }, [nodes]);

  const handleReset = () => {
    setNodes({});
    setRootId(null);
    setFocusedNodeId(null);
    setTransform({ x: window.innerWidth/2, y: window.innerHeight/2, k: 1 });
  };

  // --- Layout Calculation ---
  
  const layout = useMemo(() => {
    return calculateTreeLayout(nodes, rootId || '');
  }, [nodes, rootId]);


  // --- D3 Zoom & Auto-Center Effect ---
  
  const zoomBehavior = useMemo(() => {
      return d3.zoom<HTMLDivElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event) => {
            setTransform(event.transform);
        });
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const selection = d3.select(wrapperRef.current);
    selection.call(zoomBehavior);
    
    // Initial center
    if(!rootId) {
       const initialTransform = d3.zoomIdentity.translate(window.innerWidth/2, window.innerHeight/2).scale(1);
       selection.call(zoomBehavior.transform, initialTransform);
    }

    return () => {
      selection.on('.zoom', null);
    };
  }, [zoomBehavior, rootId]);

  // Effect to trigger smooth pan when focusedNodeId changes OR when layout updates while a node is focused
  useEffect(() => {
    if (focusedNodeId && wrapperRef.current && layout.nodes.length > 0) {
        const targetNode = layout.nodes.find(n => n.id === focusedNodeId);
        
        if (targetNode) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // We want to center the node
            // The layout coordinates (x,y) are from (0,0) at center of tree
            // We need to translate the VIEW so that (0,0) + (node.x, node.y) ends up at (screenW/2, screenH/2)
            
            const targetScale = 1; // Or keep current scale: transform.k
            
            // New Translation:
            // ScreenCenter = Translate + NodePos * Scale
            // Translate = ScreenCenter - NodePos * Scale
            const tx = width / 2 - targetNode.x * targetScale;
            const ty = height / 2 - targetNode.y * targetScale;

            const selection = d3.select(wrapperRef.current);
            
            selection.transition()
                .duration(1000)
                .ease(d3.easeBackOut.overshoot(0.8)) // Nice bouncy effect
                .call(
                    zoomBehavior.transform, 
                    d3.zoomIdentity.translate(tx, ty).scale(targetScale)
                );
        }
    }
  }, [focusedNodeId, layout, zoomBehavior]); 
  // Dependency on 'layout' ensures that if the tree grows and positions shift, we re-center.
  // Note: Frequent layout updates might cause jitter if we re-center on every small change, 
  // but layout only changes on expand, which is when we want to center anyway.


  // --- Render ---

  return (
    <div className="w-screen h-screen bg-slate-50 relative overflow-hidden selection:bg-blue-100">
      
      {/* --- Background Grid --- */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
           backgroundImage: `radial-gradient(#3b82f6 2px, transparent 2px)`,
           backgroundSize: `${30 * transform.k}px ${30 * transform.k}px`,
           backgroundPosition: `${transform.x}px ${transform.y}px`
        }}
      />

      {/* --- Header / Input UI --- */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-none p-6 flex flex-col items-center">
        <motion.div 
           initial={{ y: -50, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50 pointer-events-auto max-w-xl w-full flex gap-2"
        >
           {rootId ? (
             <div className="flex items-center justify-between w-full px-4 py-2">
                <div className="flex flex-col">
                    <h1 className="text-slate-800 font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500"/> GeminiMind
                    </h1>
                    <p className="text-slate-500 text-xs">
                        {layout.nodes.length} ideas • {inputQuery || 'Brainstorming'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                    onClick={handleReset}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Start Over"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
             </div>
           ) : (
             <>
               <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Zap className={`w-5 h-5 ${isGenerating ? 'text-yellow-500 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  <input 
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartBrainstorm()}
                    placeholder="Enter a topic (e.g., 'Cyberpunk City', 'Healthy Breakfast')"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    disabled={isGenerating}
                    autoFocus
                  />
               </div>
               <button 
                 onClick={handleStartBrainstorm}
                 disabled={isGenerating || !inputQuery.trim()}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isGenerating ? 'Thinking...' : 'Spark'}
               </button>
             </>
           )}
        </motion.div>
      </div>

      {/* --- Start Hint --- */}
      {!rootId && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
             <div className="text-center opacity-30">
                <div className="w-64 h-64 bg-blue-300/20 rounded-full blur-3xl absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                <h2 className="text-5xl font-black text-slate-300 mb-4 tracking-tight">GeminiMind</h2>
                <p className="text-slate-400 text-lg">Type a seed idea to grow a universe of thoughts</p>
             </div>
          </div>
      )}

      {/* --- Canvas Area --- */}
      <div ref={wrapperRef} className="w-full h-full cursor-grab active:cursor-grabbing">
        <div 
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                transformOrigin: '0 0',
                width: '100%', 
                height: '100%',
                position: 'relative'
            }}
        >
           <AnimatePresence>
              {rootId && (
                 <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 1, height: 1 }}>
                    {layout.links.map((link) => {
                       const key = `${link.source.id}-${link.target.id}`;
                       const { source, target } = link;
                       
                       return (
                         <motion.path
                           key={key}
                           d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                           initial={{ pathLength: 0, opacity: 0 }}
                           animate={{ pathLength: 1, opacity: 1 }}
                           transition={{ duration: 0.8, ease: "easeOut" }}
                           stroke={COLORS.line}
                           strokeWidth={1.5}
                           strokeOpacity={0.6}
                           fill="none"
                         />
                       );
                    })}
                 </svg>
              )}
           </AnimatePresence>

           <AnimatePresence>
              {layout.nodes.map((node) => (
                <MindMapNode 
                   key={node.id} 
                   node={node} 
                   onExpand={handleExpandNode} 
                />
              ))}
           </AnimatePresence>
        </div>
      </div>
      
      {/* --- Floating Controls --- */}
      {rootId && (
          <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50">
             <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white/50 p-2 flex flex-col gap-2">
                <button 
                    className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    title="Center View"
                    onClick={() => {
                        if (focusedNodeId) {
                             // Trigger re-run of effect by toggling or just direct call
                             // Simpler: just reset to root
                             setFocusedNodeId(rootId);
                        } else {
                             setFocusedNodeId(rootId);
                        }
                    }}
                >
                    <Move size={20} />
                </button>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
