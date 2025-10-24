import * as assert from 'assert';
import { LinkParser } from '../../parsers/linkParser';

/**
 * LinkParser 解析逻辑单元测试
 * 测试链接解析、类型识别等核心功能
 */
suite('LinkParser 链接解析测试', () => {
  
  suite('parseBracketLinks 测试', () => {
    
    test('应该解析简单的方括号链接', () => {
      const links = LinkParser.parseBracketLinks('这是一个 [[link]] 链接');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].type, 'bracket');
      assert.strictEqual(links[0].target, 'link');
      assert.strictEqual(links[0].description, undefined);
    });

    test('应该解析带描述的方括号链接', () => {
      const links = LinkParser.parseBracketLinks('[[target][description]]');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, 'target');
      assert.strictEqual(links[0].description, 'description');
    });

    test('应该解析多个方括号链接', () => {
      const links = LinkParser.parseBracketLinks('[[link1]] 和 [[link2][desc]]');
      
      assert.strictEqual(links.length, 2);
      assert.strictEqual(links[0].target, 'link1');
      assert.strictEqual(links[1].target, 'link2');
      assert.strictEqual(links[1].description, 'desc');
    });

    test('应该解析文件路径链接', () => {
      const links = LinkParser.parseBracketLinks('[[file:path/to/file.org]]');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, 'file:path/to/file.org');
    });

    test('应该解析标题链接', () => {
      const links = LinkParser.parseBracketLinks('[[*Heading]]');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, '*Heading');
    });

    test('应该解析 ID 链接', () => {
      const links = LinkParser.parseBracketLinks('[[#id-123]]');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, '#id-123');
    });
  });

  suite('parseHttpLinks 测试', () => {
    
    test('应该解析 HTTP 链接', () => {
      const links = LinkParser.parseHttpLinks('访问 http://example.com 了解更多');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].type, 'http');
      assert.strictEqual(links[0].target, 'http://example.com');
    });

    test('应该解析 HTTPS 链接', () => {
      const links = LinkParser.parseHttpLinks('https://secure.com');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, 'https://secure.com');
    });

    test('应该解析带路径的链接', () => {
      const links = LinkParser.parseHttpLinks('https://example.com/path/to/page?param=value');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, 'https://example.com/path/to/page?param=value');
    });

    test('应该解析多个 HTTP 链接', () => {
      const links = LinkParser.parseHttpLinks('http://site1.com 和 https://site2.com');
      
      assert.strictEqual(links.length, 2);
      assert.strictEqual(links[0].target, 'http://site1.com');
      assert.strictEqual(links[1].target, 'https://site2.com');
    });
  });

  suite('parseFileLinks 测试', () => {
    
    test('应该解析文件链接', () => {
      const links = LinkParser.parseFileLinks('file:/path/to/file.org');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].type, 'file');
      assert.strictEqual(links[0].target, '/path/to/file.org');
    });

    test('应该解析相对路径文件链接', () => {
      const links = LinkParser.parseFileLinks('file:./relative/path.org');
      
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].target, './relative/path.org');
    });

    test('应该解析多个文件链接', () => {
      const links = LinkParser.parseFileLinks('file:file1.org 和 file:file2.org');
      
      assert.strictEqual(links.length, 2);
      assert.strictEqual(links[0].target, 'file1.org');
      assert.strictEqual(links[1].target, 'file2.org');
    });
  });

  suite('parseLinks 综合测试', () => {
    
    test('应该解析混合类型的链接', () => {
      const line = '查看 [[file.org]] 或访问 https://example.com 或 file:local.org';
      const links = LinkParser.parseLinks(line);
      
      assert.strictEqual(links.length, 3);
      assert.strictEqual(links[0].type, 'bracket');
      assert.strictEqual(links[1].type, 'http');
      assert.strictEqual(links[2].type, 'file');
    });

    test('无链接的行应返回空数组', () => {
      const links = LinkParser.parseLinks('普通文本，没有链接');
      assert.strictEqual(links.length, 0);
    });
  });

  suite('isPositionInLink 测试', () => {
    
    test('应该检测位置是否在链接内', () => {
      const line = '文本 [[link]] 文本';
      
      // 在链接内
      let link = LinkParser.isPositionInLink(line, 6);
      assert.notStrictEqual(link, null);
      assert.strictEqual(link?.target, 'link');
      
      // 在链接外
      link = LinkParser.isPositionInLink(line, 2);
      assert.strictEqual(link, null);
    });

    test('应该检测位置是否在 HTTP 链接内', () => {
      const line = '访问 https://example.com 网站';
      
      let link = LinkParser.isPositionInLink(line, 10);
      assert.notStrictEqual(link, null);
      assert.strictEqual(link?.type, 'http');
    });

    test('应该处理多个链接', () => {
      const line = '[[link1]] [[link2]]';
      
      // 在第一个链接内
      let link = LinkParser.isPositionInLink(line, 3);
      assert.strictEqual(link?.target, 'link1');
      
      // 在第二个链接内
      link = LinkParser.isPositionInLink(line, 14);
      assert.strictEqual(link?.target, 'link2');
    });
  });

  suite('buildBracketLink 测试', () => {
    
    test('应该构建简单链接', () => {
      const result = LinkParser.buildBracketLink('target');
      assert.strictEqual(result, '[[target]]');
    });

    test('应该构建带描述的链接', () => {
      const result = LinkParser.buildBracketLink('target', 'description');
      assert.strictEqual(result, '[[target][description]]');
    });

    test('应该处理文件路径', () => {
      const result = LinkParser.buildBracketLink('file:path/to/file.org');
      assert.strictEqual(result, '[[file:path/to/file.org]]');
    });
  });

  suite('parseLinkTarget 测试', () => {
    
    test('应该识别 HTTP 链接', () => {
      let result = LinkParser.parseLinkTarget('http://example.com');
      assert.strictEqual(result.type, 'http');
      assert.strictEqual(result.path, 'http://example.com');
      
      result = LinkParser.parseLinkTarget('https://secure.com');
      assert.strictEqual(result.type, 'http');
    });

    test('应该识别 file: 链接', () => {
      const result = LinkParser.parseLinkTarget('file:/path/to/file.org');
      assert.strictEqual(result.type, 'file');
      assert.strictEqual(result.path, '/path/to/file.org');
    });

    test('应该识别 ID 链接', () => {
      const result = LinkParser.parseLinkTarget('#id-123');
      assert.strictEqual(result.type, 'id');
      assert.strictEqual(result.id, 'id-123');
    });

    test('应该识别纯标题链接', () => {
      const result = LinkParser.parseLinkTarget('*Heading');
      assert.strictEqual(result.type, 'headline');
      assert.strictEqual(result.headline, 'Heading');
    });

    test('应该识别文件+标题链接', () => {
      const result = LinkParser.parseLinkTarget('file.org::*Heading');
      assert.strictEqual(result.type, 'headline');
      assert.strictEqual(result.file, 'file.org');
      assert.strictEqual(result.headline, 'Heading');
    });

    test('应该识别文件+ID链接', () => {
      const result = LinkParser.parseLinkTarget('file.org::#id-123');
      assert.strictEqual(result.type, 'id');
      assert.strictEqual(result.file, 'file.org');
      assert.strictEqual(result.id, 'id-123');
    });

    test('应该识别文件链接', () => {
      const result = LinkParser.parseLinkTarget('document.org');
      assert.strictEqual(result.type, 'file');
      assert.strictEqual(result.path, 'document.org');
    });

    test('应该识别带路径的文件链接', () => {
      const result = LinkParser.parseLinkTarget('../path/to/file.org');
      assert.strictEqual(result.type, 'file');
      assert.strictEqual(result.path, '../path/to/file.org');
    });

    test('其他类型应返回 other', () => {
      const result = LinkParser.parseLinkTarget('unknown-format');
      assert.strictEqual(result.type, 'other');
      assert.strictEqual(result.path, 'unknown-format');
    });
  });

  suite('综合测试 - 链接解析流程', () => {
    
    test('应该正确解析复杂的链接行', () => {
      const line = '参考 [[file.org::*Section]] 和访问 https://example.com 或查看 [[#id-123][备注]]';
      const links = LinkParser.parseLinks(line);
      
      assert.strictEqual(links.length, 3);
      
      // 第一个链接：文件+标题
      assert.strictEqual(links[0].type, 'bracket');
      assert.strictEqual(links[0].target, 'file.org::*Section');
      const target1 = LinkParser.parseLinkTarget(links[0].target);
      assert.strictEqual(target1.type, 'headline');
      assert.strictEqual(target1.file, 'file.org');
      assert.strictEqual(target1.headline, 'Section');
      
      // 第二个链接：HTTP
      assert.strictEqual(links[1].type, 'http');
      assert.strictEqual(links[1].target, 'https://example.com');
      
      // 第三个链接：ID带描述
      assert.strictEqual(links[2].type, 'bracket');
      assert.strictEqual(links[2].target, '#id-123');
      assert.strictEqual(links[2].description, '备注');
    });

    test('应该正确处理嵌套和特殊情况', () => {
      // 方括号链接在普通文本中
      const line1 = '这是 [[link1]] 和 [[link2][desc]] 的示例';
      const links1 = LinkParser.parseLinks(line1);
      assert.strictEqual(links1.length, 2);
      
      // HTTP链接可能在方括号外
      const line2 = '[[file.org]] 参考: https://example.com';
      const links2 = LinkParser.parseLinks(line2);
      assert.strictEqual(links2.length, 2);
    });
  });
});

