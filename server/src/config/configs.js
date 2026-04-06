export const port = 3000

const clients = {
  '10.51.253.2': 'VCONF01',
  '10.51.253.3': 'VCONF02',
  '10.51.253.6': 'VCONF04'
}

function setClient(clientAddress) {
  clients[clientAddress] = clientAddress
}

export function getClient(clientAddress) {
  if (clients[clientAddress] == undefined) {
    setClient(clientAddress)
  }

  return clients[clientAddress]
}