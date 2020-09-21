const ts = require('typescript');
const prettier = require('prettier');
const prettierConfig = require('@goodeggs/prettier-config');
const { SyntaxKind } = require('typescript');
const fs = require('fs').promises;

const isNullableUnion = (type) => 
  type.kind === SyntaxKind.UnionType && type.types.map((t) => t.kind).includes(SyntaxKind.NullKeyword);

const nonNullableUnionTypes = (types) =>
  types.filter(t => t.kind !== SyntaxKind.NullKeyword);

const fakeForType = (type) => { 
  if (isNullableUnion(type)) {
    return `fake.nullable(${fakeForType({...type, types: nonNullableUnionTypes(type.types)})})`;
  }
  if (type.kind === SyntaxKind.UnionType && type.types.length === 1) {
    return fakeForType(type.types[0]);
  }
  if (type.kind === SyntaxKind.UnionType) {
    return `fake.sample([${type.types.map(fakeForType).join()}])`;
  }
  return `fake.${typeMap[type.kind]}()`;
};

const typeMap = {
  [SyntaxKind.StringKeyword]: 'word',
  [SyntaxKind.NumberKeyword]: 'integer',
};

(async () => {
  // const file = await fs.readFile('./index.tsx', 'utf8');
  const program = ts.createProgram(['./index.tsx'], {allowJs: true});
  const sourceFile = program.getSourceFile('./index.tsx');
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      if (node.name.escapedText === 'ProductImage') {
        const factoryString = `export const create${node.name.escapedText} = (override?: Partial<${
          node.name.escapedText
        }>): ${node.name.escapedText} => ({
          ${node.members
            .map((member) => {
              return `${member.name.escapedText}: ${fakeForType(member.type)},`;
            })
            .join('')}
          
          ...override,
        });`;

        console.log(prettier.format(factoryString, prettierConfig));
        // fs.writeFile(
        //   `${node.name.escapedText}.factory.ts`,
        //   prettier.format(factoryString, prettierConfig),
        // );
      }
    }
  });
})();
