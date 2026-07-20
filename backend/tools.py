from datetime import datetime
from duckduckgo_search import DDGS


def web_search(query: str) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=4))
        if not results:
            return "No results found for that search."
        output = []
        for r in results:
            output.append(f"**{r.get('title', 'No title')}**\n{r.get('body', '')}\nURL: {r.get('href', '')}")
        return "\n\n".join(output)
    except Exception as e:
        return f"Search failed: {str(e)}"


def get_current_time() -> str:
    now = datetime.now()
    return now.strftime("Today is %A, %B %d, %Y. The time is %I:%M %p.")
