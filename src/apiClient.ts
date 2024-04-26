import axios, { AxiosError } from 'axios'

export class ApiClient {
  baseUrl: string
  token: string
  timeout: number
  headers: object

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
    this.timeout = 30000
    this.headers = {
      Authorization: `Bearer ${this.token}`,
      'User-Agent': 'Unisat-Node-Client',
      'Content-Type': 'application/json',
    }
  }

  async makeRequest(method: string, path: string, data = {}) {
    const url = this.baseUrl + path
    console.log(`Starting request: ${method} ${url}`)

    try {
      const response = await axios({
        method: method,
        url: url,
        headers: this.headers,
        data: data,
        timeout: this.timeout,
      })

      console.log(
        `Response received: ${response.status} ${response.statusText}`,
      )
      return response.data
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          `Error during ${method} request to ${url}: ${error.message}`,
        )
        if (error.response) {
          console.error(
            `Error details: ${error.response.status} ${error.response.statusText}`,
          )
          console.log('Error response body:', error.response.data)
        }
      }
      throw error
    }
  }
}
