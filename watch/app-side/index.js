import { MessageBuilder } from '../shared/message'

const baseUrl = "https://example.com";

const messageBuilder = new MessageBuilder()
const fetchData = async (ctx) => {
  let response;
  try {
    async function postToServer(url, data) {
      let fullUrl = baseUrl+url;
      return response = await fetch({
        url: fullUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    }

    response = await postToServer('/notify-all', { 
      userName: "Kanha",
      subject: "",
      message: ""
    });
    let answer;
    switch (response.status) {
      case 200:
        answer = "Poke sent!";
        break;
      case 409:
        answer = "No one connected!";
        break;
      default:
        answer = `${response.status}: ${response.statusText}`
    }

    ctx.response({
      data: { result: {
        text: answer
      }},
    })
  } catch (error) {
    ctx.response({
      data: { result: {
        text: JSON.stringify(response)
      }},
    })
  }
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => {})

    messageBuilder.on('request', (ctx) => {
      const jsonRpc = messageBuilder.buf2Json(ctx.request.payload)
      if (jsonRpc.method === 'GET_DATA') {
        return fetchData(ctx)
      }
    })
  },

  onRun() {
  },

  onDestroy() {
  }
})
