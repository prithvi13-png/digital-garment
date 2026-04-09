def paginated_payload(
    *,
    count: int,
    next_link: str | None,
    previous_link: str | None,
    results: list,
    summary: dict | None = None,
) -> dict:
    payload = {
        "count": count,
        "next": next_link,
        "previous": previous_link,
        "results": results,
    }
    if summary is not None:
        payload["summary"] = summary
    return payload
