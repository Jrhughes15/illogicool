(function () {
  const DEFAULT_STUB = 10;
  const DEFAULT_SNAP = 10;
  const EPSILON = 0.001;

  function routeConnector(connector, boxes, options = {}) {
    const sourceBox = boxes[connector.fromBoxId];
    const targetBox = boxes[connector.toBoxId];
    if (!sourceBox || !targetBox) return { points: [], handles: [] };

    const snapSize = options.snapSize || options.minStub || DEFAULT_SNAP;
    const stub = options.minStub || snapSize || DEFAULT_STUB;
    const fromEdge = connector.fromEdge || 'right';
    const toEdge = connector.toEdge || 'left';
    const context = {
      connector,
      sourceBox,
      targetBox,
      fromEdge,
      toEdge,
      sourcePort: getPort(sourceBox, fromEdge),
      targetPort: getPort(targetBox, toEdge),
      sourceExit: getExitPoint(sourceBox, fromEdge, stub),
      targetEntry: getExitPoint(targetBox, toEdge, stub),
      routeFamily: classifyRoute(fromEdge, toEdge),
      placement: classifyBoxPlacement(sourceBox, targetBox, connector.routeMode),
      snapSize,
      stub,
    };

    const route = buildRoute(context);
    const withHandles = applySavedHandles(route, connector.routeHandles || [], Boolean(connector.manualRouting), snapSize);
    const points = validateOrthogonal(simplifyOrthogonalPoints(withHandles.points));
    return {
      points,
      handles: refreshHandlePositions(withHandles.handles, points),
      debug: context,
    };
  }

  function buildRoute(context) {
    if (context.routeFamily === 'hToH') return horizontalToHorizontal(context);
    if (context.routeFamily === 'vToV') return verticalToVertical(context);
    if (context.routeFamily === 'hToV') return horizontalToVertical(context);
    return verticalToHorizontal(context);
  }

  function horizontalToHorizontal(context) {
    const { sourcePort, sourceExit, targetEntry, targetPort, fromEdge, toEdge, placement } = context;
    if (oppositeHorizontal(fromEdge, toEdge) && isSameRow(context) && alignedY(sourceExit, targetEntry)) {
      return route([sourcePort, sourceExit, targetEntry, targetPort], []);
    }

    const railX = verticalRailX(context);
    return route([
      sourcePort,
      sourceExit,
      railPoint('main-v', railX, sourceExit.y),
      railPoint('main-v', railX, targetEntry.y),
      targetEntry,
      targetPort,
    ], [
      verticalHandle('main-v', railX, (sourceExit.y + targetEntry.y) / 2),
    ]);
  }

  function verticalToVertical(context) {
    const { sourcePort, sourceExit, targetEntry, targetPort, fromEdge, toEdge } = context;
    if (oppositeVertical(fromEdge, toEdge) && isDirectVerticalPlacement(context) && nearlyAlignedX(sourcePort, targetPort, context.snapSize / 2)) {
      const x = snap((sourcePort.x + targetPort.x) / 2, context.snapSize);
      return route([
        { ...sourcePort, x },
        { ...targetPort, x },
      ], []);
    }

    const railY = horizontalRailY(context);
    return route([
      sourcePort,
      sourceExit,
      railPoint('main-h', sourceExit.x, railY),
      railPoint('main-h', targetEntry.x, railY),
      targetEntry,
      targetPort,
    ], [
      horizontalHandle('main-h', (sourceExit.x + targetEntry.x) / 2, railY),
    ]);
  }

  function horizontalToVertical(context) {
    const { sourcePort, sourceExit, targetEntry, targetPort, fromEdge, toEdge } = context;
    const preferredDirect = preferredDirectBend(sourceExit, targetEntry, 'hToV');
    if (preferredDirect) {
      return route([sourcePort, sourceExit, preferredDirect, targetEntry, targetPort], []);
    }

    const railX = verticalRailForEdge(context, fromEdge);
    const railY = horizontalRailForEdge(context, toEdge);
    return route([
      sourcePort,
      sourceExit,
      railPoint('source-v', railX, sourceExit.y),
      railPoint('source-v', railX, railY),
      railPoint('target-h', targetEntry.x, railY),
      targetEntry,
      targetPort,
    ], [
      verticalHandle('source-v', railX, (sourceExit.y + railY) / 2),
      horizontalHandle('target-h', (railX + targetEntry.x) / 2, railY),
    ]);
  }

  function verticalToHorizontal(context) {
    const { sourcePort, sourceExit, targetEntry, targetPort, fromEdge, toEdge } = context;
    const preferredDirect = preferredDirectBend(sourceExit, targetEntry, 'vToH');
    if (preferredDirect) {
      return route([sourcePort, sourceExit, preferredDirect, targetEntry, targetPort], []);
    }

    const railY = horizontalRailForEdge(context, fromEdge);
    const railX = verticalRailForEdge(context, toEdge);
    return route([
      sourcePort,
      sourceExit,
      railPoint('source-h', sourceExit.x, railY),
      railPoint('source-h', railX, railY),
      railPoint('target-v', railX, targetEntry.y),
      targetEntry,
      targetPort,
    ], [
      horizontalHandle('source-h', (sourceExit.x + railX) / 2, railY),
      verticalHandle('target-v', railX, (railY + targetEntry.y) / 2),
    ]);
  }

  function preferredDirectBend(sourceExit, targetEntry, family) {
    if (alignedX(sourceExit, targetEntry) || alignedY(sourceExit, targetEntry)) return null;
    return family === 'hToV'
      ? { x: targetEntry.x, y: sourceExit.y, role: 'bend' }
      : { x: sourceExit.x, y: targetEntry.y, role: 'bend' };
  }

  function verticalRailX(context) {
    const { sourceExit, targetEntry, sourceBox, targetBox, fromEdge, toEdge, placement, stub } = context;
    if (fromEdge === toEdge) {
      return fromEdge === 'right'
        ? snap(Math.max(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width) + stub, context.snapSize)
        : snap(Math.min(sourceBox.x, targetBox.x) - stub, context.snapSize);
    }
    if (hasHorizontalGap(sourceBox, targetBox)) {
      return snap((sourceExit.x + targetEntry.x) / 2, context.snapSize);
    }
    if (placement === 'downLeft' || placement === 'upLeft') {
      return snap(Math.min(sourceBox.x, targetBox.x) - stub, context.snapSize);
    }
    if (placement === 'parallel') {
      return fromEdge === 'left'
        ? snap(Math.min(sourceBox.x, targetBox.x) - stub, context.snapSize)
        : snap(Math.max(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width) + stub, context.snapSize);
    }
    return snap((sourceExit.x + targetEntry.x) / 2, context.snapSize);
  }

  function horizontalRailY(context) {
    const { sourceExit, targetEntry, sourceBox, targetBox, fromEdge, toEdge, placement, stub } = context;
    if (fromEdge === toEdge) {
      return fromEdge === 'bottom'
        ? snap(Math.max(sourceBox.y + sourceBox.height, targetBox.y + targetBox.height) + stub, context.snapSize)
        : snap(Math.min(sourceBox.y, targetBox.y) - stub, context.snapSize);
    }
    if (hasVerticalGap(sourceBox, targetBox)) {
      return snap((sourceExit.y + targetEntry.y) / 2, context.snapSize);
    }
    if (placement === 'upRight' || placement === 'upLeft') {
      return snap(Math.min(sourceBox.y, targetBox.y) - stub, context.snapSize);
    }
    return snap(Math.max(sourceBox.y + sourceBox.height, targetBox.y + targetBox.height) + stub, context.snapSize);
  }

  function verticalRailForEdge(context, edge) {
    const { sourceBox, targetBox, sourceExit, targetEntry, stub } = context;
    if (edge === 'left') return snap(Math.min(sourceBox.x, targetBox.x) - stub, context.snapSize);
    if (edge === 'right') return snap(Math.max(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width) + stub, context.snapSize);
    return snap((sourceExit.x + targetEntry.x) / 2, context.snapSize);
  }

  function horizontalRailForEdge(context, edge) {
    const { sourceBox, targetBox, sourceExit, targetEntry, stub } = context;
    if (edge === 'top') return snap(Math.min(sourceBox.y, targetBox.y) - stub, context.snapSize);
    if (edge === 'bottom') return snap(Math.max(sourceBox.y + sourceBox.height, targetBox.y + targetBox.height) + stub, context.snapSize);
    return snap((sourceExit.y + targetEntry.y) / 2, context.snapSize);
  }

  function applySavedHandles(routeData, savedHandles, manualRouting, snapSize) {
    if (!manualRouting || !savedHandles.length) return routeData;
    const points = routeData.points.map((point) => ({ ...point }));
    const handles = routeData.handles.map((handle) => {
      const saved = savedHandles.find((item) => item.railId === handle.railId || item.id === handle.id);
      if (!saved?.userMoved) return handle;
      const next = {
        ...handle,
        x: saved.axisLock === 'x' ? snap(saved.x, snapSize) : handle.x,
        y: saved.axisLock === 'y' ? snap(saved.y, snapSize) : handle.y,
        userMoved: true,
      };
      applyHandleToRail(points, next);
      return next;
    });
    return { points, handles };
  }

  function applyHandleToRail(points, handle) {
    points.forEach((point) => {
      if (point.railId !== handle.railId) return;
      if (handle.axisLock === 'x') point.x = handle.x;
      if (handle.axisLock === 'y') point.y = handle.y;
    });
  }

  function refreshHandlePositions(handles, points) {
    return handles.map((handle) => {
      const railPoints = points.filter((point) => point.railId === handle.railId);
      if (railPoints.length >= 2) {
        return {
          ...handle,
          x: handle.axisLock === 'x' ? railPoints[0].x : (railPoints[0].x + railPoints[railPoints.length - 1].x) / 2,
          y: handle.axisLock === 'y' ? railPoints[0].y : (railPoints[0].y + railPoints[railPoints.length - 1].y) / 2,
        };
      }
      return handle;
    });
  }

  function route(points, handles) {
    return { points: points.map((point) => ({ role: 'bend', ...point })), handles };
  }

  function railPoint(railId, x, y) {
    return { x, y, role: 'bend', railId };
  }

  function verticalHandle(railId, x, y) {
    return { id: railId, kind: 'verticalRail', railId, x, y, axisLock: 'x', userMoved: false };
  }

  function horizontalHandle(railId, x, y) {
    return { id: railId, kind: 'horizontalRail', railId, x, y, axisLock: 'y', userMoved: false };
  }

  function getPort(box, edge) {
    if (edge === 'top') return { x: box.x + box.width / 2, y: box.y, role: 'port' };
    if (edge === 'right') return { x: box.x + box.width, y: box.y + box.height / 2, role: 'port' };
    if (edge === 'bottom') return { x: box.x + box.width / 2, y: box.y + box.height, role: 'port' };
    return { x: box.x, y: box.y + box.height / 2, role: 'port' };
  }

  function getEdgeVector(edge) {
    if (edge === 'top') return { x: 0, y: -1 };
    if (edge === 'right') return { x: 1, y: 0 };
    if (edge === 'bottom') return { x: 0, y: 1 };
    return { x: -1, y: 0 };
  }

  function getExitPoint(box, edge, stub) {
    const port = getPort(box, edge);
    const vector = getEdgeVector(edge);
    return { x: port.x + vector.x * stub, y: port.y + vector.y * stub, role: 'stub' };
  }

  function getEdgeAxis(edge) {
    return edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical';
  }

  function classifyRoute(fromEdge, toEdge) {
    const fromAxis = getEdgeAxis(fromEdge);
    const toAxis = getEdgeAxis(toEdge);
    if (fromAxis === 'horizontal' && toAxis === 'horizontal') return 'hToH';
    if (fromAxis === 'vertical' && toAxis === 'vertical') return 'vToV';
    if (fromAxis === 'horizontal') return 'hToV';
    return 'vToH';
  }

  function classifyBoxPlacement(sourceBox, targetBox, routeMode) {
    const sourceCenter = center(sourceBox);
    const targetCenter = center(targetBox);
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    if (routeMode === 'sameRail' || Math.abs(dy) <= Math.min(sourceBox.height, targetBox.height) / 2) return 'sameRail';
    if (xRangesOverlap(sourceBox, targetBox)) return 'parallel';
    if (dy >= 0 && dx >= 0) return 'downRight';
    if (dy >= 0 && dx < 0) return 'downLeft';
    if (dy < 0 && dx >= 0) return 'upRight';
    return 'upLeft';
  }

  function center(box) {
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  function xRangesOverlap(a, b) {
    return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0;
  }

  function hasHorizontalGap(a, b) {
    return a.x + a.width < b.x || b.x + b.width < a.x;
  }

  function hasVerticalGap(a, b) {
    return a.y + a.height < b.y || b.y + b.height < a.y;
  }

  function isSameRow(context) {
    return context.placement === 'sameRail';
  }

  function isSameColumn(context) {
    return Math.abs(center(context.sourceBox).x - center(context.targetBox).x) <= Math.min(context.sourceBox.width, context.targetBox.width) / 2;
  }

  function oppositeHorizontal(fromEdge, toEdge) {
    return (fromEdge === 'right' && toEdge === 'left') || (fromEdge === 'left' && toEdge === 'right');
  }

  function oppositeVertical(fromEdge, toEdge) {
    return (fromEdge === 'bottom' && toEdge === 'top') || (fromEdge === 'top' && toEdge === 'bottom');
  }

  function isDirectVerticalPlacement(context) {
    const { sourcePort, targetPort, fromEdge, toEdge } = context;
    return (fromEdge === 'bottom' && toEdge === 'top' && targetPort.y >= sourcePort.y)
      || (fromEdge === 'top' && toEdge === 'bottom' && targetPort.y <= sourcePort.y);
  }

  function nearlyAlignedX(a, b, tolerance) {
    return Math.abs(a.x - b.x) <= tolerance;
  }

  function alignedX(a, b) {
    return Math.abs(a.x - b.x) <= EPSILON;
  }

  function alignedY(a, b) {
    return Math.abs(a.y - b.y) <= EPSILON;
  }

  function simplifyOrthogonalPoints(points) {
    const deduped = [];
    points.forEach((point) => {
      const previous = deduped[deduped.length - 1];
      if (previous && alignedX(previous, point) && alignedY(previous, point)) return;
      deduped.push(point);
    });

    const simplified = [];
    deduped.forEach((point, index) => {
      if (index === 0 || index === deduped.length - 1 || point.railId || point.role === 'stub' || point.role === 'port') {
        simplified.push(point);
        return;
      }
      const previous = simplified[simplified.length - 1];
      const next = deduped[index + 1];
      const collinear = (alignedX(previous, point) && alignedX(point, next))
        || (alignedY(previous, point) && alignedY(point, next));
      if (!collinear) simplified.push(point);
    });
    return simplified;
  }

  function validateOrthogonal(points) {
    const fixed = [];
    points.forEach((point, index) => {
      if (index === 0) {
        fixed.push(point);
        return;
      }
      const previous = fixed[fixed.length - 1];
      if (!alignedX(previous, point) && !alignedY(previous, point)) {
        fixed.push({ x: point.x, y: previous.y, role: 'bend' });
      }
      fixed.push(point);
    });
    return fixed;
  }

  function snap(value, snapSize) {
    return Math.round(value / snapSize) * snapSize;
  }

  window.DiagrmrRouter = {
    routeConnector,
    getPort,
    getEdgeVector,
    classifyRoute,
    classifyBoxPlacement,
  };
})();
