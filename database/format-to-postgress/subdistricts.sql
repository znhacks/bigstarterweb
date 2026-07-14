SELECT
    Id AS id,
    NamaKecamatan AS nama_kecamatan,
    NamaAlt AS nama_alt,
    IdKabKota AS id_kab_kota,
    IdProvinsi AS id_provinsi,
    IdNegara AS id_negara,
    DATE_FORMAT(`In`, '%Y-%m-%d %H:%i:%s') AS inserted_at,
    InBy AS inserted_by,
    DATE_FORMAT(`Up`, '%Y-%m-%d %H:%i:%s') AS updated_at,
    UpBy AS updated_by
FROM kecamatan;