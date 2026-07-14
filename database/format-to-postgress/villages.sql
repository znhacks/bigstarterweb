SELECT
    Id AS id,
    NamaDesaKelurahan AS nama_desa_kelurahan,
    NamaAlt AS nama_alt,
    DesaKelurahan AS desa_kelurahan,
    IdKecamatan AS id_kecamatan,
    IdKabKota AS id_kab_kota,
    IdProvinsi AS id_provinsi,
    IdNegara AS id_negara,
    KodePos AS kode_pos,
    DATE_FORMAT(`In`, '%Y-%m-%d %H:%i:%s') AS inserted_at,
    InBy AS inserted_by,
    DATE_FORMAT(`Up`, '%Y-%m-%d %H:%i:%s') AS updated_at,
    UpBy AS updated_by
FROM desa
WHERE Id <> 1;