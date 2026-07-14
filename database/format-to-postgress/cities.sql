SELECT
    Id AS id,
    Name AS name,
    StateId AS state_id,
    StateCode AS state_code,
    CountryId AS country_id,
    CountryCode AS country_code,
    REPLACE(CAST(Latitude AS CHAR), ',', '.') AS latitude,
REPLACE(CAST(Longitude AS CHAR), ',', '.') AS longitude,
    WikiDataId AS wiki_data_id,
    Notes AS notes,
    DATE_FORMAT(`In`, '%Y-%m-%d %H:%i:%s') AS inserted_at,
    InBy AS inserted_by,
    DATE_FORMAT(`Up`, '%Y-%m-%d %H:%i:%s') AS updated_at,
    UpBy AS updated_by
FROM cities;