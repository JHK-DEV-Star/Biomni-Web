"""WebSocket connection manager."""

import json
import logging
from typing import Dict

from fastapi import WebSocket

from ws.events import WSMessage

logger = logging.getLogger("aigen.ws")


class ConnectionManager:
    """Tracks active WebSocket connections per conversation."""

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, conv_id: str):
        await websocket.accept()
        self._connections[conv_id] = websocket
        logger.info(f"WebSocket connected: conv_id={conv_id}")

    def disconnect(self, conv_id: str):
        self._connections.pop(conv_id, None)
        logger.info(f"WebSocket disconnected: conv_id={conv_id}")

    async def send_event(self, conv_id: str, event: WSMessage):
        ws = self._connections.get(conv_id)
        if ws:
            await ws.send_text(json.dumps(event.to_dict()))

    async def broadcast(self, event: WSMessage):
        for ws in self._connections.values():
            await ws.send_text(json.dumps(event.to_dict()))


manager = ConnectionManager()
