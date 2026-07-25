const fs = require('fs');
const file = process.argv[1];
let c = fs.readFileSync(file, 'utf8');

// Find the line: setDepartamentos(depts);
// And replace with version that also loads categorias

const oldLine = 'setDepartamentos(depts);';
const newCode = `// Traer categorias para el menu
        const { data: catsData } = await supabase
          .from('categorias')
          .select('id, nombre, departamento_id')
          .eq('activo', true)
          .order('nombre');
        // Anidar categorias en cada departamento
        const deptsConCats = depts.map(function(d) {
          return Object.assign({}, d, {
            categorias: (catsData || []).filter(function(cat) {
              return cat.departamento_id === d.id;
            })
          });
        });
        setDepartamentos(deptsConCats);`;

if (c.includes(oldLine)) {
  c = c.replace(oldLine, newCode);
  fs.writeFileSync(file, c, 'utf8');
  console.log('OK - patched successfully');
} else {
  console.log('ERROR - target line not found');
}

