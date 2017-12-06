'use strict';

function selectionVariableHelper(
    astHelper,
    typeHelper
) {

    const isVar = astHelper.isNodeType(['VariableDeclarator']);
    const isIdentifier = astHelper.isNodeType(['Identifier']);

    const isNodeInSelection =
        (coords) =>
            (node) =>
                astHelper.nodeInCoords(coords, node);

    function processIdentifiers(identifiers) {
        return function (node) {
            const isNonNativeIdentifier = typeHelper.isTypeOf('nonNativeIdentifier')(node);

            if (isNonNativeIdentifier && isIdentifier(node) && typeof node.name === 'string') {
                identifiers[node.name] = true;
            } else if (isNonNativeIdentifier && typeof node.object.name === 'string') {
                identifiers[node.object.name] = true;
            }
        };
    }

    function processBoundVars (boundVars) {
        return function (node) {
            if (isVar(node)) {
                const key = node.id.name;
                boundVars[key] = true;
            }
        };
    }

    function getUnboundVars(astCoords, ast) {
        let currentMemberExpression = null;
        
        let boundVars = {};
        let identifiers = {};

        const processIdentifier = processIdentifiers(identifiers);
        const processVariable = processBoundVars(boundVars);

        astHelper.traverse(ast, {
            enter: astHelper.onMatch(isNodeInSelection(astCoords), function (node) {
                if (currentMemberExpression === null) {
                    const isMemberExpression = node.type === 'MemberExpression';

                    processVariable(node);
                    processIdentifier(node);

                    if (isMemberExpression) {
                        currentMemberExpression = isMemberExpression ? node : currentMemberExpression;
                    }
                }

            }),
            leave: function (node) {
                if (currentMemberExpression === node) {
                    currentMemberExpression = null;
                }
            }
        });

        return Object.keys(identifiers).filter(identifier => !boundVars[identifier]);
    }

    return {
        getUnboundVars: typeHelper.enforce(
            'astCoords, ast => unboundVars',
            getUnboundVars)
    };

}

module.exports = selectionVariableHelper;