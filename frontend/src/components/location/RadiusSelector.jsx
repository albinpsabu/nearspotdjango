function RadiusSelector({
  radius,
  onRadiusChange,
}) {

  // =========================================================
  // RADIUS OPTIONS
  // =========================================================

  const radiusOptions = [
    {
      label: "1 km",
      value: 1000,
    },
    {
      label: "2 km",
      value: 2000,
    },
    {
      label: "5 km",
      value: 5000,
    },
    {
      label: "10 km",
      value: 10000,
    },
    {
      label: "20 km",
      value: 20000,
    },
  ];


  // =========================================================
  // SELECT
  // =========================================================

  return (

    <select
      value={radius}
      onChange={(event) =>
        onRadiusChange(
          Number(event.target.value)
        )
      }

      className="form-select form-select-sm"

      style={{
        width: "100%",

        height: "36px",

        backgroundColor:
          "#ffffff",

        color:
          "#263638",

        border:
          "1px solid rgba(20,40,45,0.14)",

        borderRadius:
          "9px",

        fontSize:
          "12px",

        fontWeight:
          700,

        boxShadow:
          "none",

        colorScheme:
          "light",
      }}

      aria-label="Search radius"
    >

      {radiusOptions.map(
        (option) => (

          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>

        )
      )}

    </select>

  );
}


export default RadiusSelector;