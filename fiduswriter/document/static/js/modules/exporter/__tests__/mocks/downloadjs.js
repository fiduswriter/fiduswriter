export default function download(data, filename, mimeType) {
    // Mock: just return the data for inspection
    return Promise.resolve({data, filename, mimeType})
}
