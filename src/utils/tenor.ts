import fetch from 'node-fetch';


interface ResponseCategory {
  tags: {
    searchterm: string,
    path: string,
    image: string,
    name: string
  }[]
}

export async function getTenorCategories() {
  const url = `https://g.tenor.com/v1/categories?key=${process.env.TENOR_KEY}&contentfilter=high&type=featured`
  return await fetch(url).then(async res => {
    const data: ResponseCategory = await res.json();
    return data.tags.map(category => {
      return {
        name: category.searchterm,
        previewUrl: category.image
      }
    })
  })
}

interface ResponseSearch {
  results: {
    media: any[],
    url: string,
  }[]
}

export async function getTenorSearch(value: string) {
  const url = `https://g.tenor.com/v1/search?key=${process.env.TENOR_KEY}&contentfilter=high&media_filter=basic&q=${encodeURIComponent(value)}`
  return await fetch(url).then(async res => {
    const data: ResponseSearch = await res.json();
    return data.results.map(result => {
      result.media[0].tinymp4.siteUrl = result.url
      return result.media[0].tinymp4;
    })
  })
}