import { ref, nextTick } from 'vue';
import { TreeGraph, registerNode } from '@antv/g6';
import { snackbar } from '@/utils/Snackbar.js';

export function useMindMapGraph(options = {}) {
    const {
        selectedNodeId,
        editingNodeLabel,
        floatingToolbarPosition,
        showFloatingToolbar,
        contextMenuTargetNodeId,
        contextMenuPosition,
        showContextMenu,
        onHistoryPush
    } = options;

    const graph = ref(null);

    // 注册自定义节点类型
    const registerMindMapNode = () => {
        registerNode('mindmap-node', {
            draw(cfg, group) {
                const { label, isRoot } = cfg;
                const size = isRoot ? [140, 50] : [100, 40];
                const style = {
                    fill: isRoot ? '#1976D2' : '#ffffff',
                    stroke: isRoot ? '#1976D2' : '#b7b7b7',
                    radius: 8,
                    shadowColor: 'rgba(0,0,0,0.08)',
                    shadowBlur: 8,
                    shadowOffsetX: 1,
                    shadowOffsetY: 2,
                    lineWidth: 1.5,
                };

                const keyShape = group.addShape('rect', {
                    attrs: {
                        x: -size[0] / 2,
                        y: -size[1] / 2,
                        width: size[0],
                        height: size[1],
                        ...style
                    },
                    name: 'main-box',
                    draggable: true,
                });

                group.addShape('text', {
                    attrs: {
                        text: label,
                        x: 0,
                        y: 0,
                        textAlign: 'center',
                        textBaseline: 'middle',
                        fill: isRoot ? '#fff' : '#333',
                        fontSize: isRoot ? 18 : 14,
                        fontFamily: 'Roboto, Arial, sans-serif',
                    },
                    name: 'text-shape',
                });

                return keyShape;
            },

            update(cfg, item) {
                const group = item.getContainer();
                const textShape = group.find((element) => element.get('name') === 'text-shape');
                if (textShape) {
                    textShape.attr('text', cfg.label);
                }
            },

            setState(name, value, item) {
                const group = item.getContainer();
                const shape = group.get('children')[0];
                const textShape = group.get('children')[1];

                if (name === 'selected') {
                    if (value) {
                        shape.attr({
                            shadowColor: 'rgba(25, 118, 210, 0.4)',
                            shadowBlur: 10,
                            lineWidth: 2,
                            stroke: '#1976D2'
                        });
                        textShape.attr('fill', item.getModel().isRoot ? '#fff' : '#1976D2');
                    } else {
                        shape.attr({
                            shadowColor: 'rgba(0,0,0,0.08)',
                            shadowBlur: 8,
                            lineWidth: 1.5,
                            stroke: item.getModel().isRoot ? '#1976D2' : '#b7b7b7'
                        });
                        textShape.attr('fill', item.getModel().isRoot ? '#fff' : '#333');
                    }
                }
            },
        }, 'rect');
    };

    // 初始化图形
    const initGraph = () => {
        const container = document.getElementById('g6_container');
        if (!container) {
            console.error("G6 container not found!");
            return;
        }

        // 注册节点类型
        registerMindMapNode();

        graph.value = new TreeGraph({
            container: 'g6_container',
            width: container.clientWidth,
            height: container.clientHeight,
            modes: {
                default: ['drag-canvas', 'zoom-canvas', 'drag-node']
            },
            defaultNode: {
                type: 'mindmap-node'
            },
            defaultEdge: {
                type: 'cubic-horizontal',
                style: {
                    stroke: '#979797',
                    lineWidth: 2
                }
            },
            layout: {
                type: 'mindmap',
                direction: 'H',
                getSide: (d) => d.side || 'right',
                getVGap: () => 20,
                getHGap: () => 60,
            },
            fitView: true,
            fitViewPadding: 20,
            animate: true,
            animateCfg: {
                duration: 500,
                easing: 'easeCubic',
            },
        });

        // 绑定事件
        bindGraphEvents();

        // 初始化数据
        const emptyData = getEmptyG6MindMapData();
        markRoot(emptyData);
        graph.value.data(emptyData);
        graph.value.render();
        fitView();

        // 窗口大小变化处理
        setupWindowResize(container);
    };

    // 绑定图形事件
    const bindGraphEvents = () => {
        if (!graph.value) return;

        // 节点点击事件
        graph.value.on('node:click', (evt) => {
            const { item } = evt;
            const nodeId = item.getID();
            hideContextMenu();
            selectNodeAndActivateToolbar(nodeId);
        });

        // 节点双击事件
        graph.value.on('node:dblclick', (evt) => {
            const { item } = evt;
            const nodeId = item.getID();
            selectNodeAndActivateToolbar(nodeId);
            nextTick(() => {
                // 触发浮动工具栏的输入框聚焦
                // 这里可以通过emit或者ref来处理
            });
        });

        // 画布点击事件
        graph.value.on('canvas:click', (evt) => {
            if (!evt.item || evt.item.getType() !== 'node') {
                clearSelection();
            }
        });

        // 节点右键菜单
        graph.value.on('node:contextmenu', (evt) => {
            evt.preventDefault();
            const { item, clientX, clientY } = evt;

            if (contextMenuTargetNodeId) {
                contextMenuTargetNodeId.value = item.getID();
            }
            if (contextMenuPosition) {
                contextMenuPosition.value = { x: clientX, y: clientY };
            }
            if (showContextMenu) {
                showContextMenu.value = true;
            }

            clearSelection();
        });

        // 画布右键菜单
        graph.value.on('canvas:contextmenu', (evt) => {
            evt.preventDefault();
            hideContextMenu();
        });

        // 节点拖拽结束
        graph.value.on('node:dragend', () => {
            onHistoryPush && onHistoryPush();
            if (selectedNodeId?.value) {
                selectNodeAndActivateToolbar(selectedNodeId.value);
            }
        });

        // 画布变化时更新浮动工具栏位置
        graph.value.on('aftercanvaschange', () => {
            if (selectedNodeId?.value && showFloatingToolbar?.value) {
                requestAnimationFrame(() => {
                    selectNodeAndActivateToolbar(selectedNodeId.value);
                });
            }
        });
    };

    // 设置窗口大小变化监听
    const setupWindowResize = (container) => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                if (!graph.value || graph.value.get('destroyed')) return;
                if (!container || !container.clientWidth || !container.clientHeight) return;

                graph.value.changeSize(container.clientWidth, container.clientHeight);
                fitView();

                if (selectedNodeId?.value && showFloatingToolbar?.value) {
                    selectNodeAndActivateToolbar(selectedNodeId.value);
                }
            };

            window.addEventListener('resize', handleResize);

            // 返回清理函数
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    };

    // 获取空的思维导图数据
    const getEmptyG6MindMapData = () => ({
        id: 'root',
        label: '中心主题',
        children: []
    });

    // 标记根节点
    const markRoot = (node) => {
        if (!node) return;
        node.isRoot = node.id === 'root';
        if (node.children) {
            node.children.forEach(markRoot);
        }
    };

    // 选择节点并激活工具栏
    const selectNodeAndActivateToolbar = (nodeId) => {
        if (!graph.value) return;

        // 清除所有选中状态
        graph.value.getNodes().forEach(node =>
            graph.value.clearItemStates(node, 'selected')
        );

        // 设置选中状态
        graph.value.setItemState(nodeId, 'selected', true);

        if (selectedNodeId) {
            selectedNodeId.value = nodeId;
        }

        if (editingNodeLabel) {
            editingNodeLabel.value = graph.value.findById(nodeId).getModel().label;
        }

        // 计算浮动工具栏位置
        const node = graph.value.findById(nodeId);
        if (node && floatingToolbarPosition && showFloatingToolbar) {
            const bbox = node.getBBox();
            const toolbarWidth = 350;
            const toolbarHeight = 40;

            const canvasX = bbox.x + bbox.width / 2;
            const canvasY = bbox.y - toolbarHeight - 10;

            const clientPoint = graph.value.getCanvasByPoint(canvasX, canvasY);
            const headerHeight = 64; // v-app-bar 高度

            floatingToolbarPosition.value = {
                x: clientPoint.x - toolbarWidth / 2,
                y: clientPoint.y + headerHeight
            };
            showFloatingToolbar.value = true;
        }
    };

    // 清除选择
    const clearSelection = () => {
        if (!graph.value) return;

        graph.value.getNodes().forEach(node =>
            graph.value.clearItemStates(node, 'selected')
        );

        if (selectedNodeId) {
            selectedNodeId.value = null;
        }
        if (editingNodeLabel) {
            editingNodeLabel.value = '';
        }
        if (showFloatingToolbar) {
            showFloatingToolbar.value = false;
        }
        hideContextMenu();
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
        if (showContextMenu) {
            showContextMenu.value = false;
        }
        if (contextMenuTargetNodeId) {
            contextMenuTargetNodeId.value = null;
        }
    };

    // 添加子节点
    const addNode = (targetNodeId, preferredSide = null) => {
        if (!targetNodeId) {
            snackbar.warning('请先选择一个父节点');
            return;
        }

        const parentNode = graph.value.findById(targetNodeId);
        if (!parentNode) return;

        const newId = `node-${Math.random().toString(36).substr(2, 9)}`;
        const model = { id: newId, label: '新节点' };

        if (parentNode.get('id') === 'root') {
            model.side = preferredSide || 'right';
        }

        graph.value.addChild(model, parentNode);
        graph.value.layout();
        graph.value.render();
        onHistoryPush && onHistoryPush();
        selectNodeAndActivateToolbar(newId);
    };

    // 添加同级节点
    const addBrotherNode = (targetNodeId) => {
        if (!targetNodeId) {
            snackbar.warning('请选择一个节点');
            return;
        }

        const node = graph.value.findById(targetNodeId);
        const parent = node.get('parent');

        if (!parent) {
            snackbar.warning('根节点不能添加同级节点');
            return;
        }

        const newId = `node-${Math.random().toString(36).substr(2, 9)}`;
        const model = { id: newId, label: '新节点' };

        if (parent.get('id') === 'root') {
            model.side = node.getModel().side || 'right';
        }

        graph.value.addChild(model, parent);
        graph.value.layout();
        graph.value.render();
        onHistoryPush && onHistoryPush();
        selectNodeAndActivateToolbar(newId);
    };

    // 删除节点
    const deleteNode = (targetNodeId) => {
        if (!targetNodeId) {
            snackbar.warning('请先选择一个要删除的节点');
            return;
        }

        const node = graph.value.findById(targetNodeId);
        if (node.get('id') === 'root') {
            snackbar.warning('不能删除根节点');
            return;
        }

        graph.value.removeChild(targetNodeId);
        graph.value.layout();
        graph.value.render();
        onHistoryPush && onHistoryPush();

        clearSelection();
        snackbar.success('节点已删除');
    };

    // 更新节点标签
    const updateNodeLabel = (nodeId, newLabel) => {
        const node = graph.value.findById(nodeId);
        if (node && node.getModel().label !== newLabel) {
            graph.value.updateItem(node, { label: newLabel });
            graph.value.layout();
            onHistoryPush && onHistoryPush();
        }
    };

    // 缩放控制
    const zoomIn = () => {
        if (graph.value) {
            graph.value.zoom(1.2, {
                x: graph.value.getWidth() / 2,
                y: graph.value.getHeight() / 2
            });
        }
    };

    const zoomOut = () => {
        if (graph.value) {
            graph.value.zoom(0.8, {
                x: graph.value.getWidth() / 2,
                y: graph.value.getHeight() / 2
            });
        }
    };

    const fitView = () => {
        if (graph.value) {
            graph.value.fitView();
        }
    };

    // 销毁图形
    const destroyGraph = () => {
        if (graph.value) {
            graph.value.destroy();
            graph.value = null;
        }
    };

    return {
        graph,
        initGraph,
        destroyGraph,
        selectNodeAndActivateToolbar,
        clearSelection,
        addNode,
        addBrotherNode,
        deleteNode,
        updateNodeLabel,
        zoomIn,
        zoomOut,
        fitView,
        markRoot,
        getEmptyG6MindMapData
    };
}