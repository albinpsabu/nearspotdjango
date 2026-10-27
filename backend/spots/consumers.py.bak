from channels.generic.websocket import AsyncJsonWebsocketConsumer


class SpotConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send_json({
            "type":"connection.established",
            "message":"connected to Nearspot Websocket"
        })


    async def disconnect(self,close_code):
        print(f"Websocket disconnected: {close_code}")


    async def receive_json(self, content, **kwargs):
        await self.send_json({
            "type":"echo",
            "message":content
        })



        