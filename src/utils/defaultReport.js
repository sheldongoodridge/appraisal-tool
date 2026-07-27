export const DEFAULT_REPORT = {
  version: 1,
  meta: {
    report_date: null, effective_date: null,
    inspection_date: null, inspection_type: "",
    is_update: false, original_file_number: "",
    original_effective_date: null,
    approaches_used: { dca: true, cost: false, income: false }
  },
  cover: {
    letter_body: "", letter_body2: "",
    hypothetical_condition_letter: false,
    draft_copy_disclaimer: false,
    owner_borrower_disclaimer: false
  },
  summary: {
    warnings: "", final_value: "",
    land_value: "", land_value_na: true,
    current_purchase_price: "",
    current_list_price: "", prior_list_price: "",
    last_sold_price: "", last_sold_date: "",
    reconciliation: "", exposure_analysis: "",
    trends: ""
  },
  neighbourhood: {
    land_use: {
      residential: false, commercial: false,
      industrial: false, agricultural: false,
      first_nations: false, urban: false,
      suburban: false, rural: false,
      recreational: false, forestry: false
    },
    market_conditions: {
      improving: false, stable: false,
      transitioning: false, deteriorating: false
    },
    built_up: {
      over_75: false, between_25_75: false,
      under_25: false
    },
    subject_typical: null,
    detrimental_observed: false,
    detrimental_type: "",
    age_range_from: "", age_range_to: "",
    price_range_from: "", price_range_to: "",
    market_supply: "", market_demand: "",
    price_trends: "", source_of_market_data: "",
    comments: ""
  },
  site: {
    dimensions: "", lot_size: "",
    lot_size_unit: "Sq Ft", source: "",
    topography: "", configuration: "",
    zoning_code: "", zoning_source: "",
    other_land_use_controls: false,
    other_land_use_text: "",
    existing_use_conforms: true,
    existing_use_text: "",
    in_floodplain: false, flood_map_date: "",
    easements: "Assumed Typical",
    detrimental_observed: false,
    detrimental_type: "",
    utilities: {
      natural_gas: false, storm_sewer: false,
      sanitary_sewer: false, open_ditch: false,
      septic: false, holding_tank: false
    },
    water_supply: {
      municipal: false, private_well: false,
      other: ""
    },
    features: {
      gravel_road: false, paved_road: false,
      lane: false, sidewalk: false,
      curbs: false, streetlights: false,
      other: ""
    },
    electrical: {
      overhead: false, underground: false,
      other: false
    },
    driveway: {
      private: false, shared: false,
      none: false, single: false,
      double: false, underground: false,
      laneway: false, other: ""
    },
    parking: {
      garage: false, carport: false,
      driveway: false, street: false,
      underground: false, other: ""
    },
    landscaping: {
      good: false, average: false,
      fair: false, poor: false
    },
    site_improvements: "", comments: "",
    hbu_vacant: "Residential",
    hbu_vacant_other: "",
    hbu_improved: "Existing Residential Use",
    hbu_improved_other: "", hbu_comments: "",
    hbu_land_comment: "", land_value: "",
    land_value_na: true, land_value_source: "",
    existing_use: ""
  },
  improvements: {
    year_built: "", year_additions: "",
    effective_age: "", remaining_economic_life: "",
    under_construction: false, appraised_as_is: true,
    as_if_complete: false,
    construction_complete_pct: "",
    additions_complete_pct: "",
    construction_comments: "",
    property_type: "", design_style: "",
    construction_type: "", windows_type: "",
    windows_thickness: "", basement_type: "",
    basement_area: "", basement_finish_pct: "",
    basement_comments: "", foundation_walls: "",
    roofing_type: "", roofing_condition: "",
    roofing_notes: "", exterior_finish: "",
    exterior_condition: "", exterior_notes: "",
    energy_label: "", energy_rating: "",
    ev_charger: "", solar_panels: "",
    electrical_fuses: false,
    electrical_breakers: false,
    electrical_other: "", electrical_other2: "",
    panel_capacity: "", heating_system: "",
    fuel_type: "", water_heater: "",
    cooling_system: "", plumbing_lines: "",
    plumbing_source: "",
    interior_walls: {
      drywall: false, plaster: false,
      paneling: false
    },
    interior_ceilings: {
      drywall: false, plaster: false,
      paneling: false, other: ""
    },
    flooring1: "", flooring2: "", flooring3: "",
    flooring_notes: "",
    built_ins: {
      stove: false, oven: false,
      dishwasher: false, microwave: false,
      water_softener: false
    },
    extras: {
      security_system: false, fireplace: false,
      fireplace_type: "", hr_ventilator: false,
      pool: false, smart_home: "",
      other1: "", other2: ""
    },
    overall_condition: "",
    detrimental_observed: false,
    detrimental_type: "",
    garage: {
      attached: false, detached: false,
      built_in: false, stalls: "",
      drop1: "", drop2: "", drop3: ""
    },
    driveway_detail: {
      private: false, mutual: false,
      underground: false, laneway: false,
      none: false, single: false,
      double: false, other: ""
    },
    parking_detail: {
      garage: false, carport: false,
      driveway: false, street: false,
      other: ""
    },
    site_improvements: "", comments: "",
    source_of_measurement: "",
    unit_of_measurement: "SqFt"
  },
  room_allocation: {
    main: {
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    second: {
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    third: {
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    fourth: {
      label: "",
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    fifth: {
      label: "",
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    basement: {
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: "", area: ""
    },
    basement2: {
      label: "",
      entrance: "", living: "", dining: "",
      kitchen: "", family: "", bedrooms: "",
      den: "", full_bath: "", part_bath: "",
      laundry: "", a: "", b: "", c: "",
      room_total: ""
    },
    above_grade_totals: {
      rooms: "", bedrooms: "",
      full_bath: "", part_bath: "",
      room_total: "", area: ""
    },
    total_area: "", unit_sqft: true
  },
  comparables: [],
  comp_analyses: "",
  dca_estimated_value: "",
  history: {
    sold_within_3_years: false,
    sale_date: "", sale_price: "",
    sale_source: "", sale_transfer_history: "",
    listed_within_1_year: false,
    last_list_price: "", currently_listed: false,
    current_list_price: "", under_contract: false,
    obtained: false, pending_price: "",
    agreements: ""
  },
  exposure: { analysis: "", as_if: "" },
  reconciliation: {
    comments: "", final_value: "",
    effective_date: null, report_date: null,
    remaining_economic_life: ""
  },
  scope: { content: "" },
  certification: {
    extra_certifications: "",
    disclaimer_blank: "",
    professional_assistance: "N/A",
    professional_assistance_text: "",
    cosigner_name: "", cosigner_designation: "",
    cosigner_membership: "",
    source_of_signature: "Software Company (NAME)",
    date_inspection_2: null, date_report_2: null
  },
  addenda: {
    additional_sales: false, cost_approach: false,
    extraordinary_items: false, narrative: false,
    photographs: true, building_sketch: false,
    market_rent: false, maps: false,
    income_approach: false, scope_of_work: true,
    progress_inspection: false,
    plans_specifications: false,
    addendum_dropdown: "", addendum_dropdown2: "",
    addendum_dropdown4: "", addenda_dropdown2: "",
    addenda_dropdown3: "", addenda_dropdown4: "",
    addendum_dropdown5: ""
  },
  photos: {
    mandatory: { front: null, rear: null, street: null },
    interior_pages: [],
    comp_photos: {
      comp1: null, comp2: null, comp3: null,
      comp4: null, comp5: null, comp6: null
    }
  },
  cost_approach: {
    land_value: "", source_of_cost_data: "",
    source_of_cost_data_other: "",
    items: [],
    total_replacement_cost: "",
    physical_deterioration: "",
    functional_obsolescence: "",
    external_obsolescence: "",
    total_depreciation_pct: "",
    total_depreciation_dollar: "",
    depreciated_value: "", estimated_value: "",
    comments: ""
  },
  market_rent: {
    included: false, use_conforms: null,
    currently_rented: null, rental_history: "",
    included_in_rent: {
      electricity: false, hot_water: false,
      garbage: false, cable: false,
      parking: false, maintenance_fees: false,
      water_levies: false, heating: false,
      fridge: false, stove: false
    },
    market_comments: "", comparables: [],
    final_estimate: "",
    estimated_rent_from: "", estimated_rent_to: ""
  },
  income_approach: { included: false },
  extraordinary_items: {
    included: false, assumptions_text: "",
    hypothetical_text: ""
  },
  narrative: {
    included: false, content: "", content2: ""
  },
  parties: {
    client: {
      name: "", attention: "", address: "",
      email: "", phone: "", fax: ""
    },
    appraiser: {
      name: "", company: "", address: "",
      email: "", phone: "", fax: "",
      membership_number: "", designation: "", province: ""
    },
    cosigner: {
      enabled: false,
      name: "", designation: "", membership_number: "",
      date_inspection: null, date_report: null,
      professional_assistance: "N/A",
      professional_assistance_text: ""
    }
  }
};
